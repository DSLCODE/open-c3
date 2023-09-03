package api::bpm;
use Dancer ':syntax';
use Dancer qw(cookie);
use Encode qw(encode);

use JSON qw();
use POSIX;
use api;
use Format;
use LWP::UserAgent;
use File::Basename;

use POSIX;
use Time::Local;
use File::Temp;
use BPM::Flow;

=pod

BPM/获取bpm列表

=cut

get '/bpm/menu' => sub {
    my $pmscheck = api::pmscheck( 'openc3_agent_read' ); return $pmscheck if $pmscheck;

#    my $conf = eval{ BPM::Flow->new()->menu() };
    my @col = qw( name alias describe );
    my $conf = eval{ $api::mysql->query( sprintf( "select %s from openc3_job_bpm_menu where `show`='1'", join ",", map{"`$_`"}@col ), \@col )}; 

    return $@ ? +{ stat => $JSON::false, info => "get menu fail:$@" } : +{ stat => $JSON::true, data => $conf };
};

=pod

BPM/获取bpm流程的变量

=cut

get '/bpm/variable/:bpmname' => sub {
    my $param = params();
    my $error = Format->new(
        bpmname => qr/^[a-zA-Z\d][a-zA-Z\d\-]+$/, 1,
    )->check( %$param );
    return  +{ stat => $JSON::false, info => "check format fail $error" } if $error;
    my $pmscheck = api::pmscheck( 'openc3_agent_read' ); return $pmscheck if $pmscheck;

    my $conf = eval{ BPM::Flow->new()->variable( $param->{bpmname} )};
    return $@ ? +{ stat => $JSON::false, info => "load config fail:$@" } : +{ stat => $JSON::true, data => $conf };
};

=pod

BPM/获取bpm流程中的日志

=cut

get '/bpm/log/:bpmuuid' => sub {
    my $param = params();
    my $error = Format->new( 
        bpmuuid => qr/^[a-zA-Z\d]+$/, 1,
    )->check( %$param );
    return  +{ stat => $JSON::false, info => "check format fail $error" } if $error;

    my $pmscheck = api::pmscheck( 'openc3_job_read', 0 ); return $pmscheck if $pmscheck;

    my @col = qw( id step info time );
    my $r = eval{ $api::mysql->query( sprintf( "select %s from openc3_job_bpm_log where bpmuuid='$param->{bpmuuid}'", join ",", @col ), \@col )}; 

    return +{ stat => $JSON::false, info => $@ } if $@;

    my %res;
    for( @$r )
    {
        my $step = $_->{step};
        $res{$step} ||= [];
        $_->{info} =~ s/(TT00\d{8})/<a href="\/tt\/#\/tt\/show\/$1" target='_blank'>$1<\/a>/;
        push @{ $res{$step} }, $_;
    }
    return +{ stat => $JSON::true, data => \%res };
};

=pod

BPM/获取bpm某个流程的变量

=cut

get '/bpm/var/:bpmuuid' => sub {
    my $param = params();
    my $error = Format->new( 
        bpmuuid => qr/^[a-zA-Z\d]+$/, 1,
    )->check( %$param );
    return  +{ stat => $JSON::false, info => "check format fail $error" } if $error;

    my $pmscheck = api::pmscheck( 'openc3_job_read', 0 ); return $pmscheck if $pmscheck;
    my $var = eval{ BPM::Task::Config->new()->get( $param->{bpmuuid} ); };
    return $@ ? +{ stat => $JSON::false, info => $@ } : +{ stat => $JSON::true, data => $var };
};

=pod

BPM/编辑流程

=cut

post '/bpm/var/:bpmuuid' => sub {
    my $param = params();
    my $error = Format->new( 
        bpmuuid => qr/^[a-zA-Z\d]+$/, 1,
    )->check( %$param );
    return  +{ stat => $JSON::false, info => "check format fail $error" } if $error;

    my $pmscheck = api::pmscheck( 'openc3_job_read', 0 ); return $pmscheck if $pmscheck;

    my $user = $api::sso->run( cookie => cookie( $api::cookiekey ), map{ $_ => request->headers->{$_} }qw( appkey appname ) );
    return +{ stat => $JSON::false, info => "nofind user" } unless $user;

    my @x = `c3mc-bpm-optionx-opapprover`;
    chomp @x;
    return +{ stat => $JSON::false, info => "Unauthorized" } unless grep{ $user eq $_ }@x;

    eval{ BPM::Task::Config->new()->resave( $param->{bpm_variable}, $user, $param->{bpmuuid} ); };
    return $@ ? +{ stat => $JSON::false, info => $@ } : +{ stat => $JSON::true };
};

=pod

BPM/获取bpm流程保护信息

=cut

get '/bpm/protect/:bpmuuid' => sub {
    my $param = params();
    my $error = Format->new( 
        bpmuuid => qr/^[a-zA-Z\d]+$/, 1,
    )->check( %$param );
    return  +{ stat => $JSON::false, info => "check format fail $error" } if $error;

    my $pmscheck = api::pmscheck( 'openc3_job_read', 0 ); return $pmscheck if $pmscheck;

    my @col = qw( stat info operator );
    my $r = eval{ $api::mysql->query( sprintf( "select %s from openc3_job_bpm_protect where bpmuuid='$param->{bpmuuid}'", join ",", @col ), \@col )}; 

    return $@ ?  +{ stat => $JSON::false, info => $@ } : +{ stat => $JSON::true, data => @$r ? $r->[0] : +{ stat => 'safe' } };
};

=pod

BPM/BPM流程保护审批意见

=cut

post '/bpm/protect/:bpmuuid' => sub {
    my $param = params();
    my $error = Format->new( 
        bpmuuid => qr/^[a-zA-Z\d]+$/, 1,
        opinion => [ 'in', 'agree', 'refuse' ], 1,
    )->check( %$param );
    return  +{ stat => $JSON::false, info => "check format fail $error" } if $error;

    my $pmscheck = api::pmscheck( 'openc3_job_root' ); return $pmscheck if $pmscheck;

    my $user = $api::sso->run( cookie => cookie( $api::cookiekey ), map{ $_ => request->headers->{$_} }qw( appkey appname ) );
    return +{ stat => $JSON::false, info => "nofind user" } unless $user;

    eval{ $api::mysql->execute( "update openc3_job_bpm_protect set stat='$param->{opinion}',operator='$user' where bpmuuid='$param->{bpmuuid}' and stat='danger'" )};

    return $@ ? +{ stat => $JSON::false, info => $@ } : +{ stat => $JSON::true };
};

=pod

BPM/获取BPM任务的UUID

=cut

get '/bpm/taskuuid/:bpmuuid' => sub {
    my $param = params();
    my $error = Format->new( 
        bpmuuid => qr/^[a-zA-Z\d]+$/, 1,
    )->check( %$param );
    return  +{ stat => $JSON::false, info => "check format fail $error" } if $error;

    my $pmscheck = api::pmscheck( 'openc3_agent_read' ); return $pmscheck if $pmscheck;

    my $r = eval{ $api::mysql->query( "select uuid from openc3_job_task where extid='$param->{bpmuuid}'" )}; 
    return +{ stat => $JSON::false, info => $@ } if $@;
    return +{ stat => $JSON::false, info => "nofind bpm taskuuid" } unless $r && @$r > 0;
    return +{ stat => $JSON::true, data => $r->[0][0] };
};

=pod

BPM/通过任务UUID获取BPMUUID

=cut

get '/bpm/bpmuuid/:taskuuid' => sub {
    my $param = params();
    my $error = Format->new( 
        taskuuid => qr/^[a-zA-Z\d]+$/, 1,
    )->check( %$param );
    return  +{ stat => $JSON::false, info => "check format fail $error" } if $error;

    my $pmscheck = api::pmscheck( 'openc3_agent_read' ); return $pmscheck if $pmscheck;

    my $r = eval{ $api::mysql->query( "select extid from openc3_job_task where uuid='$param->{taskuuid}'" )}; 
    return +{ stat => $JSON::false, info => $@ } if $@;
    return +{ stat => $JSON::false, info => "nofind bpm uuid" } unless $r && @$r > 0;
    return +{ stat => $JSON::true, data => $r->[0][0] };
};


=pod

BPM/查询这个流程是不是当前需要我处理的

=cut

get '/bpm/deal/:bpmuuid' => sub {
    my $param = params();
    my $error = Format->new( 
        bpmuuid => qr/^[a-zA-Z\d]+$/, 1,
    )->check( %$param );
    return  +{ stat => $JSON::false, info => "check format fail $error" } if $error;

    my $pmscheck = api::pmscheck( 'openc3_agent_read' ); return $pmscheck if $pmscheck;

    my $user = $api::sso->run( cookie => cookie( $api::cookiekey ), map{ $_ => request->headers->{$_} }qw( appkey appname ) );
    return +{ stat => $JSON::false, info => "nofind user" } unless $user;

    my $r = eval{ $api::mysql->query( "select status from openc3_job_bpm_deal where bpmuuid='$param->{bpmuuid}' and dealer='$user' and status='wait'" )}; 
    return +{ stat => $JSON::false, info => $@ } if $@;

    return +{ stat => $JSON::true, data => ( $r && @$r ) ? 1 : 0 };
};

=pod

BPM/设置流程处理状态

=cut

post '/bpm/deal/:bpmuuid' => sub {
    my $param = params();
    my $error = Format->new( 
        bpmuuid => qr/^[a-zA-Z\d]+$/, 1,
        opinion => [ 'in', 'agree', 'refuse' ], 1,
    )->check( %$param );
    return  +{ stat => $JSON::false, info => "check format fail $error" } if $error;

    my $pmscheck = api::pmscheck( 'openc3_agent_read' ); return $pmscheck if $pmscheck;

    my $user = $api::sso->run( cookie => cookie( $api::cookiekey ), map{ $_ => request->headers->{$_} }qw( appkey appname ) );
    return +{ stat => $JSON::false, info => "nofind user" } unless $user;

    my $r = eval{ $api::mysql->execute( "update openc3_job_bpm_deal set status='$param->{opinion}' where bpmuuid='$param->{bpmuuid}' and dealer='$user' and status='wait'" )};
    return +{ stat => $JSON::false, info => $@ } if $@;

    return +{ stat => $JSON::true, data => $r };
};

=pod

BPM/管理/获取bpm列表详情

=cut

get '/bpm/manage/menu' => sub {
    my $param = params();
    my $error = Format->new( 
        name => [ 'mismatch', qr/'/ ], 0,
    )->check( %$param );
    return  +{ stat => $JSON::false, info => "check format fail $error" } if $error;

    my $where = '';
    $where = "where name like '%$param->{name}%'" if defined $param->{name};
 
    my $pmscheck = api::pmscheck( 'openc3_agent_read' ); return $pmscheck if $pmscheck;

    my @col = qw( name alias describe show type );
    my $conf = eval{ $api::mysql->query( sprintf( "select %s from openc3_job_bpm_menu %s", join( ",", map{"`$_`"}@col ), $where), \@col )}; 

    return $@ ? +{ stat => $JSON::false, info => "get menu fail:$@" } : +{ stat => $JSON::true, data => $conf };
};

=pod

BPM/管理/获取详情

=cut

get '/bpm/manage/conf/:bpmname' => sub {
    my $param = params();
    my $error = Format->new(
        bpmname => qr/^[a-zA-Z\d][a-zA-Z\d\-]+$/, 1,
    )->check( %$param );
    return  +{ stat => $JSON::false, info => "check format fail $error" } if $error;
 
    my $pmscheck = api::pmscheck( 'openc3_agent_root' ); return $pmscheck if $pmscheck;

    my $name = $param->{bpmname};
    my @col = qw( name alias describe show type );
    my $conf = eval{ $api::mysql->query( sprintf( "select %s from openc3_job_bpm_menu where `name`='$name'", join ",", map{"`$_`"}@col ), \@col )}; 
    return +{ stat => $JSON::false, info => "get menu fail:$@" } if $@;

    my $step = eval{ YAML::XS::LoadFile "/data/Software/mydan/JOB/bpm/config/flow/$name/plugin" };
    return +{ stat => $JSON::false, info => "get step list fail:$@" } if $@;

    my ( @step, $index );
    for my $stepname ( @$step )
    {
        $index ++;
        my @conffile = (
            "/data/Software/mydan/JOB/bpm/config/flow/$name/plugin.conf/$index.$stepname.yaml",
            "/data/Software/mydan/JOB/bpm/config/flow/$name/plugin.conf/$stepname.yaml",
            "/data/Software/mydan/Connector/pp/bpm/action/$stepname/data.yaml"
        );

        my $type = '';
        my $conf = '';
        for my $conffile ( @conffile )
        {
            next unless -f $conffile;
            $conf = `cat $conffile`;
            $type = File::Basename::basename $conffile;
            last;
        }
        push @step, +{ name => $stepname, conf => Encode::decode("utf8", $conf ), type => $type };
    }

    return +{ stat => $JSON::true, data => +{ base => $conf->[0], step => \@step } };
};


=pod

BPM/管理/创建或编辑

=cut

post '/bpm/manage/conf/:bpmname' => sub {
    my $param = params();
    my $error = Format->new(
        bpmname => qr/^[a-zA-Z\d][a-zA-Z\d\-]+$/, 1,
    )->check( %$param );
    return  +{ stat => $JSON::false, info => "check format fail $error" } if $error;
 
    my $pmscheck = api::pmscheck( 'openc3_agent_root' ); return $pmscheck if $pmscheck;


    my ( $base, $step ) = @$param{qw( base step )};
    my $name = $param->{bpmname};
    $name = "bpm-$name" unless $name =~ /^bpm-/;

    my @col = qw( name alias describe show type );
    my $conf = eval{ $api::mysql->query( sprintf( "select %s from openc3_job_bpm_menu where `name`='$name'", join ",", map{"`$_`"}@col ), \@col )}; 
    return +{ stat => $JSON::false, info => "get menu fail:$@" } if $@;

    if( @$conf )
    {
        eval{ $api::mysql->execute( "update openc3_job_bpm_menu set `alias`='$base->{alias}',`describe`='$base->{describe}' where name='$name'" )};
        return +{ stat => $JSON::false, info => "update menu fail:$@" } if $@;
    }
    else
    {

        eval{ $api::mysql->execute( "insert into openc3_job_bpm_menu(`name`,`alias`,`describe`,`show`,`type`)values('$name','$base->{alias}','$base->{describe}','1','diy')" ) };
        return +{ stat => $JSON::false, info => "insert menu fail:$@" } if $@;
    }

    my @step = map{ $_->{name} }@$step;

    my $path1 = "/data/Software/mydan/JOB/bpm/config/flow/$name";
    system "mkdir -p '$path1'" unless -d $path1;

    eval{ YAML::XS::DumpFile "$path1/plugin", \@step; };
    return +{ stat => $JSON::false, info => "save plugin step fail:$@" } if $@;

    my $path2 = "/data/Software/mydan/JOB/bpm/config/flow/$name/plugin.conf";
    system "mkdir -p '$path2'" unless -d $path2;

    my $index;
    for my $x ( @$step )
    {
        $index ++;
        my $p = "$path2/$index.$x->{name}.yaml";

        my ( $TEMP, $tempfile ) = File::Temp::tempfile();
        print $TEMP $x->{conf};
        close $TEMP;
        system "mv '$tempfile' '$p'";

        return +{ stat => $JSON::false, info => "save plugin step fail:$@" } if $@;
    }

    my $x = `/data/Software/mydan/JOB/bpm/bin/jobinit '$name'`;
    return $? ? +{ stat => $JSON::false, info => "jobinit fail:$x" } : +{ stat => $JSON::true };
};

=pod

BPM/管理/删除

=cut

del '/bpm/manage/conf/:bpmname' => sub {
    my $param = params();
    my $error = Format->new(
        bpmname => qr/^[a-zA-Z\d][a-zA-Z\d\-]+$/, 1,
    )->check( %$param );
    return  +{ stat => $JSON::false, info => "check format fail $error" } if $error;
 
    my $pmscheck = api::pmscheck( 'openc3_agent_root' ); return $pmscheck if $pmscheck;

    my $r = eval{ $api::mysql->execute( "delete from openc3_job_bpm_menu where name='$param->{bpmname}'" )};
    return +{ stat => $JSON::false, info => $@ } if $@;

    return +{ stat => $JSON::true, data => $r };
};

=pod

BPM/管理/获取插件列表

=cut

get '/bpm/manage/plugin/list' => sub {
    my @x = `ls /data/Software/mydan/Connector/pp/bpm/action`;
    chomp @x;
    return +{ stat => $JSON::true, data =>\@x };
};

=pod

BPM/管理/获取插件列表

=cut

get '/bpm/manage/plugin/conf/:name' => sub {
    my $param = params();
    my $error = Format->new(
        name => qr/^[a-zA-Z\d][a-zA-Z\d\-]+$/, 1,
    )->check( %$param );
    return  +{ stat => $JSON::false, info => "check format fail $error" } if $error;
 
    my $pmscheck = api::pmscheck( 'openc3_agent_read' ); return $pmscheck if $pmscheck;

    my $x = `cat /data/Software/mydan/Connector/pp/bpm/action/$param->{name}/data.yaml `;
    return +{ stat => $JSON::true, data => Encode::decode("utf8", $x ) };
};

=pod

BPM/管理/修改BPM显示开关

=cut

any '/bpm/manage/show/:name/:show' => sub {
    my $param = params();
    my $error = Format->new(
        name => qr/^[a-zA-Z\d][a-zA-Z\d\-]+$/, 1,
        show => qr/^\d+$/, 1,
    )->check( %$param );
    return  +{ stat => $JSON::false, info => "check format fail $error" } if $error;
 
    my $pmscheck = api::pmscheck( 'openc3_agent_root' ); return $pmscheck if $pmscheck;

    eval{ $api::mysql->execute( "update openc3_job_bpm_menu set `show`='$param->{show}' where name='$param->{name}'" )};
    return +{ stat => $JSON::false, info => "update bpm show status fail:$@" } if $@;

    return +{ stat => $JSON::true };
};

=pod

BPM/获取bpm定时任务列表

=cut

get '/bpm/crontask' => sub {
    my $pmscheck = api::pmscheck( 'openc3_agent_read' ); return $pmscheck if $pmscheck;

    my @res;
    my $file = "/data/open-c3-data/bpm/crontask.txt";
    if( -f $file )
    {
        my @x = `cat $file`;
        chomp @x;
        for( @x )
        {
            my ( $action, $crontab, $node, $editor, $start, $end ) = split /;/, $_;
            $crontab = "0 $crontab * * *" if $crontab =~ /^\d+$/;
            my $startstat = $start < time ? 1 : 0;
            my $endstat   = time < $end   ? 1 : 0;

            my $endhelp = $end - $start > 86400 * 365 ? sprintf " (%d year)", int(( $end - $start ) / ( 86400 * 365 ) ) : "";

            $start   = POSIX::strftime( "%Y-%m-%d %H:%M:%S", localtime($start) );
            $end     = POSIX::strftime( "%Y-%m-%d %H:%M:%S", localtime($end  ) );
            push @res, +{ action => $action, crontab => $crontab, node => $node, editor => $editor, start => $start, startstat => $startstat, end => "$end$endhelp", endstat => $endstat };
        }
    }

    return +{ stat => $JSON::true, data => \@res };
};

=pod

BPM/上传附件

=cut

post '/bpm/attachments' => sub {
    my $pmscheck = api::pmscheck( 'openc3_agent_read' ); return $pmscheck if $pmscheck;

    my $upload = request->uploads;
    return  +{ stat => $JSON::false, info => 'upload undef' } unless $upload && ref $upload eq 'HASH';

    my $path = "/data/open-c3-data/bpm/attachments";
    system( "mkdir -p  $path" ) unless -d $path;

    my %res;
    for my $info ( values %$upload )
    {
        my $error = Format->new( 
            filename => [ 'mismatch', qr/'/ ], 1,
            tempname => [ 'mismatch', qr/'/ ], 1,
            size => qr/^\d+$/, 1,
        )->check( %$info );
        return  +{ stat => $JSON::false, info => "check format fail $error" } if $error;

        my ( $filename, $tempname, $size ) = @$info{qw( filename tempname size )};

        open my $fh, "<$tempname" or return +{ stat => $JSON::false, info => 'open file fail' };
        my $md5 = Digest::MD5->new()->addfile( $fh )->hexdigest;
        close $fh;

        return  +{ stat => $JSON::false, info => 'rename fail' } if system "mv '$tempname' '$path/$md5' && chmod a+r '$path/$md5'";

        $res{$md5} = $filename;
    }

    return  +{ stat => $JSON::true, data => \%res };
};

true;

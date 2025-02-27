(function() {
    'use strict';

    angular
        .module('openc3')
        .controller('CiController', CiController);

    function CiController($location, $anchorScroll, $state, $http, $uibModal, treeService, ngTableParams, resoureceService, $scope, genericService, $injector, $timeout ) {

        var vm = this;
        vm.treeid = $state.params.treeid;
        vm.projectid = $state.params.projectid;
        vm.seftime = genericService.seftime
        var toastr = toastr || $injector.get('toastr');

        vm.siteaddr = window.location.protocol + '//' + window.location.host;

        treeService.sync.then(function(){
            vm.nodeStr = treeService.selectname();
        });
        $scope.panelcolor = { "success": "green", "fail": "red", "refuse": "orange", "running": "#98b2bc", "decision": "#aaa", "ignore": "#aaa", "ready": "#aaa" }

        vm.cislavestr = '';

        vm.showEditLog = function () {
            $uibModal.open({
                templateUrl: 'app/pages/quickentry/flowline/detail/log.html',
                controller: 'CiCtrlLogController',
                controllerAs: 'cictrlLog',
                backdrop: 'static',
                size: 'lg',
                keyboard: false,
                bindToController: true,
                resolve: {
                    getGroup: function () {return vm.getGroupInfo},
                    groupid: function () {},
                }
            });
        };

        vm.showTagFind = function () {
            $uibModal.open({
                templateUrl: 'app/pages/quickentry/flowline/detail/findtag.html',
                controller: 'FindTagController',
                controllerAs: 'findtag',
                backdrop: 'static',
                size: 'lg',
                keyboard: false,
                bindToController: true,
                resolve: {
                    treeid: function () {return vm.treeid},
                    projectid: function () {},
                    cislavestr: function () {return vm.cislavestr},
                }
            });
        };

        vm.versionlist = [];
        vm.reload = function(limit){
            vm.loadover = false;
            $http.get('/api/ci' + vm.cislavestr + '/version/' + vm.treeid + '/' + vm.projectid + '?limit=' + limit ).success(function(data){
                if(data.stat == true) 
                { 
                    vm.versionlist = [];
                    angular.forEach(data.data, function (d) {
                        if( d['status'] == 'success'  )
                        {
                            if( vm.versionlist.length < 30 )
                            {
                                vm.versionlist.push(d);
                            }
                        }
                    });
 
                    vm.activeRegionTable = new ngTableParams({count:20}, {counts:[],data:data.data});
                    vm.loadover = true;
                } else { 
                    toastr.error( "加载版本失败:" + data.info )
                }
            });
        };

        vm.stop = function(){
            $http.put('api/ci' + vm.cislavestr + '/version/' + vm.treeid + '/' + vm.projectid + '/stop_project').success(function(data){
                if (data.stat == true) {
                    swal({ title: "停止成功!", type:'success' });
                    vm.reload();
                } else {
                    swal({title: "停止失败！", text: data.info, type: 'error'});
                }
            });
        };

//        vm.reload();

        vm.reloadprojectinfo = function(){
            vm.k8sname = [];
            $http.get('/api/ci/project/' + vm.treeid + '/' + vm.projectid ).success(function(data){
                if(data.stat == true) 
                { 
                    vm.project = data.data;
                    if( vm.project.ci_type == 'kubernetes' )
                    {
                        vm.k8sname = vm.project.ci_type_name.split(",");
                    }

                    if ( vm.project.cislave != 'master' )
                    {
                        vm.cislavestr = '/cislavenode/' + vm.project.cislave;
                    }

                    vm.reload();

                } else {
                    toastr.error( "加载项目信息失败:" + data.info )
                }
            });
        };

        vm.reloadprojectinfo();

        vm.showlog = function(versionuuid,slave){
            $uibModal.open({
                templateUrl: 'app/pages/quickentry/flowline/showlog.html',
                controller: 'CiShowLogController',
                controllerAs: 'showlog', 
                backdrop: 'static', 
                size: 'lg', 
                keyboard: false,
                windowClass:'modal-class',
                bindToController: true,
                resolve: {
                    nodeStr: function () { return vm.nodeStr },
                    reloadhome: function () { return vm.reload },
                    versionuuid: function () { return versionuuid },
                    slave: function () { return slave },
                    cislavestr: function () {return vm.cislavestr},
                }
            });
        };

        vm.build = function( uuid ){
          swal({
            title: "确定构建",
            type: "warning",
            showCancelButton: true,
            confirmButtonColor: "#DD6B55",
            cancelButtonText: "取消",
            confirmButtonText: "确定",
            closeOnConfirm: true
          }, function(){
            $http.put('/api/ci' + vm.cislavestr + '/version/' + vm.treeid + '/' + vm.projectid + '/' + uuid + '/build' ).success(function(data){
                if(data.stat == true) 
                { 
                    vm.reload();
                } else { 
                    swal({ title: "提交失败!", text: data.info, type:'error' }); 
                }
            })

          })
        };

         vm.killbuild = function( uuid, slave ){
          swal({
            title: "确定停止",
            type: "warning",
            showCancelButton: true,
            confirmButtonColor: "#DD6B55",
            cancelButtonText: "取消",
            confirmButtonText: "确定",
            closeOnConfirm: true
          }, function(){
            $http.put('/api/ci' + vm.cislavestr + '/slave/' + slave + '/killbuild/' + uuid  ).success(function(data){
                if(data.stat == true) 
                { 
                    vm.reload();
                } else { 
                    toastr.error( "停止操作失败:" + data.info )
                }
            })

          })
        };

        vm.isRollbackTask = function (uuid){
            uuid = uuid.slice(uuid.length - 1);
            if (64 < uuid.charCodeAt(0) && uuid.charCodeAt(0) < 91) {
                return 1
            } else {
                return 0
            }
        };

        vm.taskInfoTest = {}
        vm.taskInfoOnline = {}
        vm.taskInfoRollback = {}

        vm.getTaskInfo = function (treeId) {
            $http.get('/api/jobx/task/' + treeId + '?allowslavenull=1&name=_ci_' + vm.projectid + '_' ).then(
                function successCallback(response) {
                    if (response.data.stat){
                        angular.forEach(response.data.data, function (value, key) {

                        var version = vm.cversion( value.variable );
                        var rollbackversion = vm.crollbackversion( value.variable );
                        var jobtype = vm.cjobtype( value.variable );

                        value.version = version
                        value.rollbackversion = rollbackversion

                        if( jobtype == 'test' )
                        {
                            if( ! vm.taskInfoTest[version] )
                            {
                                vm.taskInfoTest[version] = []
                            }
                            vm.taskInfoTest[version].push(value)
                        }

                        if( jobtype == 'online' )
                        {
                            var isRollbackTask = vm.isRollbackTask( value.uuid)
                            if( isRollbackTask )
                            {
                                var str = value.uuid
                                var strrep = str.length - 1
                                str = str.replace(str[strrep],str[strrep].toLowerCase());
                                value.uuid = str
                                vm.taskInfoRollback[value.uuid] = value
                            }
                            else
                            {
                                if( ! vm.taskInfoOnline[version] )
                                {
                                    vm.taskInfoOnline[version] = []
                                }
                                vm.taskInfoOnline[version].push(value)
                            }
                        }

                        });
                    }else {
                    }
                },
                function errorCallback (response){
                });
        };
        vm.getTaskInfo(vm.treeid);

        vm.cversion = function(text) {
            var w = '';
            var re=/\bversion:.*/;
            if (re.test(text)){
                var reStr = re.exec(text)[0];
                w = reStr.split(" ")[1]
                var xx = /'/;
                if( xx.test(w) )
                {
                    w = w.split("'")[1]
                }
            }
            return w
        }

        vm.crollbackversion = function(text) {
            var w = '';
            var re=/\b_rollbackVersion_:.*/;
            if (re.test(text)){
                var reStr = re.exec(text)[0];
                w = reStr.split(" ")[1]
                var xx = /'/;
                if( xx.test(w) )
                {
                    w = w.split("'")[1]
                }
            }
            return w
        }

        vm.cjobtype = function(text) {
            var w = '';
            var re=/\b_jobtype_:.*/;
            if (re.test(text)){
                var reStr = re.exec(text)[0];
                w = reStr.split(" ")[1]
                var xx = /'/;
                if( xx.test(w) )
                {
                    w = w.split("'")[1]
                }
            }
            return w
        }


        vm.deployDetail = function(uuid){
            $state.go('home.history.jobxdetail', {treeid:vm.treeid, taskuuid:uuid, accesspage:true});
        };

        vm.runJob = function(version, jobtype, noshowrollback ) {
            $uibModal.open({
                templateUrl: 'app/pages/quickentry/flowline/runTask2Ci.html',
                controller: 'RunTask2CiController',
                controllerAs: 'runtask2ci', 
                backdrop: 'static', 
                size: 'lg', 
                keyboard: false,
                bindToController: true,
                resolve: {
                    treeid: function () { return vm.treeid },
                    version: function () { return version },
                    jobtype: function () { return jobtype },
                    name: function () { return '_ci_' + vm.projectid + '_' },
                    groupname: function () { return '_ci_' + jobtype + '_'  + vm.projectid + '_' },
                    showIPstr: function () { return $scope.showIPstr[jobtype] },
                    jobStep: function () { return vm.jobStep },
                    projectname: function () { return vm.project.name },
                    projectid: function () { return vm.projectid },
                    noshowrollback: function () { return noshowrollback },
                    versionlist: function () { return vm.versionlist },
                }
            });
        }

        vm.runBranch = function() {
            $uibModal.open({
                templateUrl: 'app/pages/quickentry/flowline/runTask2Branch.html',
                controller: 'RunTask2BranchController',
                controllerAs: 'runtask2branch', 
                backdrop: 'static', 
                size: 'lg', 
                keyboard: false,
                bindToController: true,
                resolve: {
                    treeid: function () { return vm.treeid },
                    projectid: function () { return vm.projectid },
                }
            });
        }

        vm.runTags = function() {
            $uibModal.open({
                templateUrl: 'app/pages/quickentry/flowline/runTask2Tags.html',
                controller: 'RunTask2TagsController',
                controllerAs: 'runtask2tags', 
                backdrop: 'static', 
                size: 'lg', 
                keyboard: false,
                bindToController: true,
                resolve: {
                    treeid: function () { return vm.treeid },
                    projectid: function () { return vm.projectid },
                }
            });
        }

        vm.editconfig = function () {
            $uibModal.open({
                templateUrl: 'app/pages/quickentry/flowline/detail/config.html',
                controller: 'ConfigController',
                controllerAs: 'config',
                backdrop: 'static',
                size: 'lg',
                keyboard: false,
                bindToController: true,
                resolve: {
                    getGroup: function () {return vm.getGroupInfo},
                    projectid: function () {return vm.projectid},
                    treeid: function () {return vm.treeid},
                    name: function () {return vm.project.name},
                    groupid: function () {},
                }
            });
        };

    $scope.showIPstr = { 'test': [], 'online': [] };
    $scope.showIPstrLen = { 'test': 0, 'online': 0 };
    vm.loadNodeInfo = function(envname)
    {
        $scope.showIPstr[envname] = [];
        $scope.showIPstrLen[envname] = 0;
        $http.get('/api/jobx/group/' + vm.treeid+"/"+'_ci_' + envname + '_' + vm.projectid + '_'+"/node/byname").then(
            function successCallback(response) {
                if (response.data.stat){
                    vm.groupData = response.data.data;
                    angular.forEach(vm.groupData, function (subip, i) {
                        var suball = [];
                        var onelen = subip.length;
                        if (onelen >0){
                            var ss = 0;
                            var group_num = 0;
                            var ipstr = [];
                            angular.forEach(subip, function (ip, n) {
                                if (ss === 8){
                                    suball.push(ipstr.join());
                                    ss = 0;
                                    ipstr = []
                                }
                                ipstr.push(ip);
                                if(onelen === n+1){
                                    suball.push(ipstr.join());
                                }
                                ss +=1;
                                group_num += 1;
                            });
                            var infos = {"num": group_num, "infos": suball};
                            $scope.showIPstr[envname].push(infos);
                        }
                    })
                    $scope.showIPstrLen[envname] = $scope.showIPstr[envname].length
                }else {
                    toastr.error("获取项目机器信息失败："+response.data.info)
                }
           },
           function errorCallback (response ){
               toastr.error("获取项目机器信息失败："+response.status)
       });

    }

    vm.loadNodeInfo('test');
    vm.loadNodeInfo('online');

    vm.jobStep = []
    vm.ecsname = [];
    vm.jobStepLen = 0
    vm.loadJobInfo = function()
    {
        vm.jobStep = []
        vm.ecsname = [];
        vm.jobStepLen = 0
        $http.get('/api/job/jobs/' + vm.treeid+"/byname?name="+'_ci_' + vm.projectid + '_' ).then(
            function successCallback(response) {
                if (response.data.stat){
                    vm.jobData = response.data.data;
                    if( vm.jobData.data )
                    {
                        angular.forEach(vm.jobData.data, function (d) {
                                vm.jobStep.push(d.name);
                                if( d.scripts_type == 'buildin' )
                                {
                                    var isecs = /^#!awsecs/;
                                    var isapply = /apply/;
                                    var hastaskdef = /task-definition:/;
                                    if( d.scripts_cont && d.scripts_argv &&  isecs.test( d.scripts_cont) && hastaskdef.test( d.scripts_cont)  && isapply.test( d.scripts_argv ) )
                                    {
                                        var reg = /task-definition:(.*)\b/;
                                        var cnt = reg.exec(d.scripts_cont )
                                        var ecsname = 'unknown';
                                        if( cnt && cnt.length > 1 )
                                        {
                                            ecsname = cnt[1].trim()
                                        }

                                        var reg1 = /minimumHealthyPercent:(.*)\b/;
                                        var cnt1 = reg1.exec(d.scripts_cont )
                                        var min = 'min';
                                        if( cnt1 && cnt1.length > 1 )
                                        {
                                            min = cnt1[1].trim()
                                        }

                                        var reg2 = /maximumPercent:(.*)\b/;
                                        var cnt2 = reg2.exec(d.scripts_cont )
                                        var max = 'max';
                                        if( cnt2 && cnt2.length > 1 )
                                        {
                                            max = cnt2[1].trim()
                                        }

                                        vm.ecsname.push( { "name": ecsname, "cmd": d.scripts_cont, "ticketid": d.user, "min": min, "max": max } )
                                    }
                                }
                        });
                        vm.jobStepLen = vm.jobStep.length
                    }
                }else {
                    toastr.error( "获取作业信息失败" + response.data.info );
                }
           },
           function errorCallback (response ){
                toastr.error( "获取作业信息失败" + response.status );
       });

    }

    vm.loadJobInfo();

    vm.projectvvversioncount = {}
    vm.projectvvversionnode = {}
    vm.projectvv = +{}
    vm.reloadvv = function(){
        $http.get('/api/job/vv/' + vm.treeid + '?name=APP__ci_' + vm.projectid + '__VERSION' ).success(function(data){
            if(data.stat == true) 
            { 
                vm.projectvv = data.data;
                angular.forEach(vm.projectvv, function (d) {
                    if( ! vm.projectvvversioncount[d.value] )
                    {
                        vm.projectvvversioncount[d.value] = 0
                        vm.projectvvversionnode[d.value] = []
                    }
                    vm.projectvvversioncount[d.value] = vm.projectvvversioncount[d.value] + 1
                    vm.projectvvversionnode[d.value].push( d.node )
                });
            } else {
                toastr.error( "加载项目变量失败:" + data.info )
            }
        });
    };

    vm.reloadvv();

    vm.shownum = function(num)
    {
        if( ! num )
        {
            return 0
        }
        return num
    }



        vm.versionitems = {};
        vm.versions = [];



        vm.getVersion = function () {
            $http.get('/api/job/vv/' + vm.treeid + '/analysis/version').then(
                function successCallback(response) {
                    if (response.data.stat) {
                        vm.allversion = response.data.data;
                        angular.forEach(vm.allversion, function(project){
                            vm.versionitems[project.name] = [];
                            if( project.name == 'APP__ci_' + vm.projectid  + '__VERSION')
                            {
                                vm.versions.push(project.name);
                            }
                            angular.forEach(project.data, function(value, key) {
                                vm.versionitems[project.name].push([key, parseFloat(value)]);
                            });
                        });
                        $timeout(function(){vm.showVersions(vm.versionitems)}, 0);
                    }else{
                        toastr.error( "获取作业信息失败：" + response.data.info )
                    };
                });
                function errorCallback(response) {
                    toastr.error( "获取作业信息失败：" + response.status )
                }
        };

        vm.describek8s = function (name) {
            if(  vm.project.ci_type_kind == 'deployment' )
            {
                vm.describedeployment( name );
            }
            if(  vm.project.ci_type_kind == 'daemonset' )
            {
                vm.describeutil( 'daemonset', name, vm.project.ci_type_namespace );
            }
        };

        vm.describedeployment = function (name) {
            $uibModal.open({
                templateUrl: 'app/pages/kubernetesmanage/describedeployment.html',
                controller: 'KubernetesDescribeDeploymentController',
                controllerAs: 'kubernetesdescribedeployment',
                backdrop: 'static',
                size: 'lg',
                keyboard: false,
                bindToController: true,
                resolve: {
                    treeid: function () {return vm.treeid},
                    type: function () {return vm.project.ci_type_kind},
                    name: function () {return name},
                    namespace: function () {return vm.project.ci_type_namespace},
                    ticketid: function () {return vm.project.ci_type_ticketid},
                }
            });
        };

        vm.describeutil = function (type,name,namespace) {
            $uibModal.open({
                templateUrl: 'app/pages/kubernetesmanage/describe.html',
                controller: 'KubernetesDescribeController',
                controllerAs: 'kubernetesdescribe',
                backdrop: 'static',
                size: 'lg', 
                keyboard: false,
                bindToController: true,
                resolve: {
                    treeid: function () {return vm.treeid},
                    type: function () {return type},
                    name: function () {return name},
                    namespace: function () {return namespace},
                    ticketid: function () {return vm.project.ci_type_ticketid},
                }
            });
        };
        vm.describeecs = function (name,data) {
            $uibModal.open({
                templateUrl: 'app/pages/kubernetesmanage/describeecs.html',
                controller: 'KubernetesDescribeEcsController',
                controllerAs: 'kubernetesdescribeecs',
                backdrop: 'static',
                size: 'lg',
                keyboard: false,
                bindToController: true,
                resolve: {
                    treeid: function () {return vm.treeid},
                    type: function () {return vm.project.ci_type_kind},
                    name: function () {return name},
                    data: function () {return data},
                    namespace: function () {return vm.project.ci_type_namespace},
                    ticketid: function () {return vm.project.ci_type_ticketid},
                }
            });
        };
//
        vm.editk8s = function (name) {
            if(  vm.project.ci_type_kind == 'deployment' )
            {
                vm.createdeployment( name );
            }
            if(  vm.project.ci_type_kind == 'daemonset' )
            {
                vm.createdaemonset( name );
            }
        };

        vm.createdeployment = function (name) {
            $http.get('/api/ci/ticket/' + vm.project.ci_type_ticketid ).then(
                function successCallback(response) {
                    if (response.data.stat) {
                        vm.createDeployment(name, response.data.data);
                    }else{
                        toastr.error( "获取凭据信息失败：" + response.data.info )
                    };
                });
                function errorCallback(response) {
                    toastr.error( "获取凭据信息失败：" + response.status )
                }
        };

        vm.createdaemonset = function (name) {
            $http.get('/api/ci/ticket/' + vm.project.ci_type_ticketid ).then(
                function successCallback(response) {
                    if (response.data.stat) {
                        vm.createDaemonset(name, response.data.data);
                    }else{
                        toastr.error( "获取凭据信息失败：" + response.data.info )
                    };
                });
                function errorCallback(response) {
                    toastr.error( "获取凭据信息失败：" + response.status )
                }
        };

        vm.createDeployment = function (name, selecteCluster) {
            $uibModal.open({
                templateUrl: 'app/pages/kubernetesmanage/createdeployment.html',
                controller: 'KubernetesCreateDeploymentController',
                controllerAs: 'kubernetescreatedeployment',
                backdrop: 'static',
                size: 'lg',
                keyboard: false,
                bindToController: true,
                resolve: {
                    treeid: function () {return vm.treeid},
                    ticketid: function () {return vm.project.ci_type_ticketid},
                    clusterinfo: function () {return selecteCluster},
                    namespace: function () {return vm.project.ci_type_namespace},
                    name: function () {return name},
                    homereload: function () {return function(){}},
                }
            });

        };
        vm.createDaemonset = function (name, selecteCluster) {
            $uibModal.open({
                templateUrl: 'app/pages/kubernetesmanage/createdaemonset.html',
                controller: 'KubernetesCreateDaemonSetController',
                controllerAs: 'kubernetescreatedaemonset',
                backdrop: 'static',
                size: 'lg',
                keyboard: false,
                bindToController: true,
                resolve: {
                    treeid: function () {return vm.treeid},
                    ticketid: function () {return vm.project.ci_type_ticketid},
                    clusterinfo: function () {return selecteCluster},
                    namespace: function () {return vm.project.ci_type_namespace},
                    name: function () {return name},
                    homereload: function () {return function(){}},
                }
            });

        };

        vm.getVersion();

        vm.lastversion = {};
        vm.getLastVersion = function () {
            $http.get('/api/jobx/flowline_version/' + vm.projectid ).then(
                function successCallback(response) {
                    if (response.data.stat) {
                        vm.lastversion = response.data.data;
                    }else{
                        toastr.error( "获取作业信息失败：" + response.data.info )
                    };
                });
                function errorCallback(response) {
                    toastr.error( "获取作业信息失败：" + response.status )
                }
        };


        vm.getLastVersion();

        vm.showVersions = function (data) {
            var data_info = JSON.stringify(data);
            angular.forEach(data, function (value, key) {
                var container = '#' + key;
                $(container).highcharts({
                    chart: {
                        plotBackgroundColor: null,
                        plotBorderWidth: null,
                        plotShadow: false
                    },
                    title: {
                        text: ''
                    },
                    tooltip: {
                        headerFormat: '{series.name}<br>',
                        pointFormat: '{point.name}: <b>{point.percentage:.1f}%</b>'
                    },
                    plotOptions: {
                        pie: {
                            allowPointSelect: true,
                            cursor: 'pointer',
                            dataLabels: {
                                enabled: true,
                                format: '<b>{point.name}</b>: {point.percentage:.1f} %',
                                style: {
                                    color: (Highcharts.theme && Highcharts.theme.contrastTextColor) || 'black'
                                }
                            }
                        }
                    },
                    series: [{
                        type: 'pie',
                        name: '',
                        data: value
                    }]
                });
            });

        };


    }
})();

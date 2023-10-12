(function () {
    'use strict';
    angular
        .module('openc3')
        .controller('BpmController', BpmController);

    function BpmController($state, $uibModal,$http, $scope, $timeout,resoureceService, $injector, $location, $window ) {

        var vm = this;
        vm.treeid = $state.params.treeid;
        vm.defaulttreeid = '0';
        vm.bpmuuid = $state.params.bpmuuid;
        vm.jobid = $state.params.jobid;

        vm.checkTypeMap = {}

        vm.queryChoiceFlag = false;
        vm.inputValueType = ['email']
        vm.ipValueType = ['comma_seprate', 'forbit_whitespace']
        vm.inputValueTypeMap = {email: '邮箱'}
        vm.checkRegMap = {
          email: /^\w+([-+.]\w+)*@\w+([-.]\w+)*\.\w+([-.]\w+)*$/,
          comma_seprate: /^(\d{1,3}\.){3}\d{1,3}(,\s*(\d{1,3}\.){3}\d{1,3})*$/,
          forbit_whitespace:  /^\S+\S$/
        }
        vm.bpmInfoApplicant = ''
        vm.bpmInfoDepartment = ''

        vm.dinit = function() {
            vm.optionx = {};
            vm.valias = {};
            vm.selectxloading = {};
            vm.selectxrely = {};
            vm.selectxhide = {};
            vm.textareaLoading = {};
        };

        vm.dinit();

        var toastr = toastr || $injector.get('toastr');

        vm.bpmname = $location.search()['name'];
        vm.debug = $location.search()['debug'];
        vm.errorResult = '';
        vm.errorResultLabel = '';

        vm.debugswitch = function() {
            if( vm.debug == 0 || vm.debug == undefined )
            {
                vm.debug = 1;
            }
            else
            {
                vm.debug = 0;
            }
        };

        $scope.jobVar = [];         // 保存作业中需要填写的变量
        $scope.choiceJob = null;    // 已选择的作业数据
        $scope.taskData = {
            'jobname':null,
            'group':null,
            'variable':{},
            'uuid':null,
        };

        if ($state.params.choicejob) {
          vm.queryChoiceFlag = true
          $scope.choiceJob = $state.params.choicejob
        }

        vm.isstring = function ( obj ) {
            if( typeof obj === 'string')
            {
                return true;
            }
            else
            {
                return false;
            }
        };
 
        // false 代表不通过 true代表通过
        vm.conformExtraReg = function (info) {
          if (!info.value) {
            return true
          } else {
            if (!info.value_type) {
              return true
            } else if (typeof info.value_type === 'string' ) {
              return vm.checkRegMap[info.value_type].test(String(info.value))
            }else if (Array.isArray(info.value_type)) {
              return info.value_type.every(matched => vm.checkRegMap[matched].test(String(info.value)))
            }
          }
        }
        // 获取申请人基础信息/OA信息
        vm.useroainfoloadover = false;
        vm.getApplyUserOa = function( user ){
            $http.get('/api/tt/base/get_user_info?user=' + user).success(function(data){
                vm.useroainfo = data.data;
                vm.useroainfoloadover = true;
                vm.bpmInfoApplicant = `${data.data.accountId? data.data.accountId: ''}${data.data.accountName? `-${data.data.accountName}`:''}${data.data.mobile? `-${data.data.mobile}`:''}`
                vm.bpmInfoDepartment = `${data.data.sybDeptName? data.data.sybDeptName:''}${data.data.oneDeptName? `-${data.data.oneDeptName}`:''}${data.data.twoDeptName? `-${data.data.twoDeptName}`:''}`
            });
        };

        // 获取申请人领导信息
        vm.userleaderinfoloadover = false;
        vm.getApplyUserLeader = function( user ){
            $http.get('/api/ci/c3mc/base/userleader?user=' + user).success(function(data){
                vm.userleaderinfo = data.data;
                vm.userleaderinfoloadover = true;
            });
        };

 
        vm.ideal = 0;
        vm.idealloadover = false;
        vm.getDeal = function(){
            $http.get('/api/job/bpm/deal/' + vm.bpmuuid ).success(function(data){
                vm.ideal = data.data;
                vm.idealloadover = true;
            });
        };

        vm.deal = function( opinion ){
            swal({
                title: "处理:" + opinion,
                text: 'deal',
                showCancelButton: true,
                showLoaderOnConfirm: true
             }, function( result ){
                vm.reSave( opinion );
            });
        };

        vm.taskDetail = function(){
            var url = $state.href('home.history.bpmdetail', {treeid: '0',taskuuid:vm.taskuuid});
            window.open( url, '_blank' );
        };

        vm.getsubTaskDetails =  function () {
            $http.get('/api/job/bpm/taskuuid/' + vm.bpmuuid).then(
                function successCallback(response) {
                    if (response.data.stat){
                        vm.taskuuid = response.data.data;

                        $http.get('/api/job/subtask/' + 0 + "/" + vm.taskuuid).then(
                            function successCallback(response) {
                                if (response.data.stat){
                                    vm.allRuningData = response.data.data;
                                }else {
                                    swal('获取信息失败', response.data.info, 'error' );
                                }
                            },
                            function errorCallback (response){
                                swal('获取信息失败', response.status, 'error' );
                            });



                    }else {
                        swal('获取任务编号失败', response.data.info, 'error' );
                    }
                },
                function errorCallback (response){
                    swal('获取任务编号失败', response.status, 'error' );
                });

            };

        vm.showfromops = '0';
        vm.fromopsdefault = '0';
        vm.vfromops = {};
        vm.fromops = function ( type ) {
            vm.fromopsdefault = type;
            angular.forEach($scope.jobVar, function (data, idx) {
                if( data.fromops == '1' )
                {
                    vm.vfromops[data.name] = type;
                }
            });
        };
        vm.selectIndex = 0
        vm.chtempclear = function ( obj ) {
            if( obj.type == "kvarray" )
            {
                obj.tempvalue = [];
                vm.chKvArray( obj );
            }
            if( obj.type == "selectxm" )
            {
                obj.tempvalue = [ { "value": "" }];
                vm.chSelectxm( obj );
            }
        };

        vm.chSelectxm = function ( obj, index ) {

            var curr = obj['tempvalue'][index];

            if( curr != undefined )
            {
                var repeat = 0;
                angular.forEach(obj['tempvalue'], function (data, idx) {
                    if( data.value == curr.value )
                    {
                        repeat = repeat + 1;
                    }
                });

                if( repeat >= 2 )
                {
                    curr.value = '';
                }
            }

            var temp = [];
            angular.forEach(obj['tempvalue'], function (data, idx) {
                temp.push(data.value)
            });
            obj['value'] = temp.join(',');
 
            vm.optionxchange('clear', obj,  obj.name, obj.value )
        };

        vm.addSelectxm = function ( obj ) {
            if( obj['tempvalue'] == undefined )
            {
                obj['tempvalue'] = [];
            }
            obj['tempvalue'].push( { "value": "" } );

            var temp = [];
            angular.forEach(obj['tempvalue'], function (data, idx) {
                temp.push(data.value)
            });
            obj['value'] = temp.join(',');
        };

        vm.delSelectxm = function ( obj, index ) {
            obj['tempvalue'].splice(index , 1);
            var temp = [];
            angular.forEach(obj['tempvalue'], function (data, idx) {
                temp.push(data.value)
            });
            obj['value'] = temp.join(',');
        };

        vm.chKvArray = function ( obj ) {
            obj['value'] = angular.toJson( obj['tempvalue'] );
        };

        vm.addKvArray = function ( obj ) {
            if( obj['tempvalue'] == undefined )
            {
                obj['tempvalue'] = [];
            }
            obj['tempvalue'].push( { "key": "", "value": "" } );
            obj['value'] = angular.toJson( obj['tempvalue'] );
        };

        vm.delKvArray = function ( obj, index ) {
            obj['tempvalue'].splice(index , 1);
            obj['value'] = angular.toJson( obj['tempvalue'] );
        };

        vm.delVar = function ( index, lastvarname ) {
            var lastvarnames = lastvarname.split(".")
            for( var i = $scope.jobVar.length -1; i>=0;i--)
            {
                var names = $scope.jobVar[i].name.split(".")
                if( names[0] == lastvarnames[0] && names[1] == lastvarnames[1] )
                {
                    $scope.jobVar.splice(i , 1);
                }
            }
        };
        vm.addVar = function ( index, lastvarname ) {
            vm.multitempidx = vm.multitempidx + 1;
            var lastvarnames = lastvarname.split(".")
        
            var tempidx = 0;
            angular.forEach($scope.jobVar, function (data, idx) {
                var names = data.name.split(".")
                if( names[0] == lastvarnames[0] && names[1] == lastvarnames[1] )
                {
                    tempidx = tempidx + 1;
                    names[1] = vm.multitempidx;
                    var newdata = angular.copy(data);
                    newdata.name = names.join('.')
                    newdata['byaddvar'] = true;
                    $scope.jobVar.splice(index + tempidx, 0, newdata);
                    if (vm.vfromops[data.name]) {
                      vm.vfromops[newdata.name] = vm.vfromops[data.name]
                    }
                    if( vm.optionx[data.name] )
                    {
                        vm.optionx[newdata.name] = vm.optionx[data.name];
                    }
                    if( vm.selectxrely[data.name] != undefined )
                    {
                        vm.selectxrely[newdata.name] = vm.selectxrely[data.name];
                    }
 
                    if( vm.selectxhide[data.name] != undefined )
                    {
                        vm.selectxhide[newdata.name] = vm.selectxhide[data.name];
                    }
                }
            });
        };

        vm.loadbpmlog =  function () {
            $http.get('/api/job/bpm/log/' + vm.bpmuuid ).then(
                function successCallback(response) {
                    if (response.data.stat){
                        vm.bpmlog = response.data.data
                    }else {
                        swal('获取信息失败', response.data.info, 'error' );
                    }
                },
                function errorCallback (response){
                    swal('获取信息失败', response.status, 'error' );
                });
        };
        vm.bpmlog = {};
 
        vm.bpmvar = {};
        vm.oldcaseuser = '';
        vm.loadbpmvar = function () {
            $http.get('/api/job/bpm/var/' + vm.bpmuuid ).success(function(data){
                if (data.stat){
                    vm.bpmvar = data.data;
                    vm.getApplyUserOa(data.data._user_);
                    vm.getApplyUserLeader(data.data._user_);
                    if( data.data['_sys_opt_'] )
                    {
                        vm.optionx      = data.data['_sys_opt_']['optionx'];
                        vm.valias       = data.data['_sys_opt_']['valias'];
                        vm.selectxrely  = data.data['_sys_opt_']['selectxrely'];
                        vm.selectxhide  = data.data['_sys_opt_']['selectxhide'];
                        $scope.jobVar   = data.data['_sys_opt_']['variable'];
                        // C3TODO 230306 BPM表单的数据，存入后重新获取后，整型变成了字符串类型
                        // 这里的multitempidx存入时是一个数字，存入后重新获取，变成了一个字符串
                        // 现在通过Number进行转换，应该处理一下接口让其返回数字类型
                        vm.multitempidx = Number(data.data['_sys_opt_']['multitempidx']);
                        vm.oldcaseuser = data.data['_user_'];
                    }
                    vm.reload();
                }else {
                    swal({ title:'获取表单内容失败', text: data.info, type:'error' });
                }
            });
        };
 
        vm.extname = function( stepname )
        {
                var stepnames = stepname.split(".")
                var prefix;
                var rawname;
                if( stepnames.length == 2 )
                {
                    prefix = stepnames[0];
                    rawname = stepnames[1];
                }
                else
                {
                    prefix = stepnames[0] + '.' + stepnames[1];
                    rawname = stepnames[2]
                }
                return [ prefix, rawname ];
        }

        let timeout = null;
        vm.changeDebounce = function (varDict, stepinfo, stepname) {
          if (timeout) {
            $timeout.cancel(timeout);
          }
          vm.textareaLoading[stepname] = true
          if (vm.conformExtraReg(stepinfo)) {
            timeout = $timeout(function () {
              if (stepinfo.value && stepinfo.optchk && stepinfo.optchk.length > 0) {
                vm.errorResultLabel = stepinfo.describe
                const params = {
                  bpm_variable: varDict,
                  stepname: stepinfo.name,
                  jobname: $scope.choiceJob.name
                }
                $http.post('/api/ci/v2/c3mc/bpm/optchk', params).success(function (data) {
                  if (data.stat) {
                    vm.textareaLoading[stepname] = false
                    vm.errorResult = data.data
                    stepinfo['errorCheckingInformation'] = data.data
                  } else {
                    vm.textareaLoading[stepname] = false
                    vm.errorResult = data.info
                    swal({ title: '获取选项失败', text: data.info, type: 'error' });
                  }
                });
              } else {
                vm.textareaLoading[stepname] = false
                stepinfo['errorCheckingInformation'] = ''
                vm.errorResult = ''
              }
            }, 800)
          } else {
            const isChekFlag = vm.ipValueType.every(item => stepinfo.value_type.includes(item))
            if (stepinfo.value_type && Array.isArray(stepinfo.value_type) && isChekFlag) {
              vm.errorResultLabel = stepinfo.describe
              vm.errorResult = '请填写正确的IP格式，不允许有任何形式的空格、换行符,并用英文逗号隔开'
            }
            if (stepinfo.value_type && vm.inputValueType.includes(stepinfo.value_type)) {
              vm.errorResultLabel = stepinfo.describe
              vm.errorResult = `请填写${vm.inputValueTypeMap[stepinfo.value_type]}格式`
            }
            stepinfo['errorCheckingInformation'] = vm.errorResult
            vm.textareaLoading[stepname] = false
          }
        }

        //  校验逻辑
        vm.checkOptchk = function (sameLevelArr, stepname) {
          const varDict = {}
          angular.forEach($scope.jobVar, function (data, index) {
            varDict[data.name] = data.value;
          });
          angular.forEach(sameLevelArr, function (item, index) {
            try {
              vm.changeDebounce(varDict, item, item.name)
            } catch (error) {
              vm.textareaLoading[stepname] = false
            }
          })
        }

        vm.optionxchange = function (type, stepinfo, stepname, stepvalue, stepoption) {
          // optcheck字段调用接口校验逻辑
          if (type !== 'clear') {
            const tempName = vm.extname( stepname );
            const sameLevelArr = []
            const varDict = {}
            angular.forEach($scope.jobVar, function (data, index) {
              varDict[data.name] = data.value;
              // 获取与当前操作框同级的变量(包含本身)
              if (vm.extname(data.name)[0] === tempName[0] && vm.extname(data.name)[1] !== tempName[1]) {
                sameLevelArr.push(data)
              }
            });
            if (stepinfo.value_type || stepinfo.optchk) {
              vm.errorResult = '加载中';
              vm.changeDebounce(varDict, stepinfo, stepname)
              return
            }
            const hasOptChkArr = sameLevelArr.filter(item => item.value_type || item.optchk)
            if (hasOptChkArr.length > 0) {
              vm.checkOptchk(sameLevelArr, stepname)
            }
          }
             if( stepoption != undefined )
             {
                  angular.forEach(stepoption, function (data, index) {
                      if( data.name == stepvalue )
                      {
                          vm.valias[stepname] = data.alias;
                      }
                  });
             }

             var ename = vm.extname( stepname );
             //clear
             angular.forEach($scope.jobVar, function (data, index) {

                 var tempename = vm.extname( data.name ); 
                 if( ename[0] == tempename[0] && data['rely'])
                 {
                    angular.forEach(data['rely'], function (name, index) {
                        if( name == ename[1] )
                        {
                            data.value= "";
                            vm.optionx[data.name] = undefined; //清空下拉列表
                            vm.chtempclear(data);
                        }
                    });
                 }
            });

             //clear point
             angular.forEach($scope.jobVar, function (data, index) {
                 var tempename = vm.extname( data.name ); 

                 //ename[0];    // 变动的框的前缀
                 //ename[1];    // 变动的框的名称
                 //tempename[0] //当前的框的前缀
                 //tempename[1] //当前的框的名称
                 // 我的步骤中有point配置，做一下处理，看是不是需要清空自己
                 if( data['command'] && typeof data['command'] === 'object' && data['command'][0] == 'point' ) //是否配置的point
                 {
                      var bindname = data['command'][1];//绑定的上一步插件的选项名字
                      var linkname = data['command'][2];//我与它关联的字段

                      var otherlinkkey = ename[0] + "." + bindname;
                      var mylinkkey    = tempename[0] + "." + bindname;//这两个值不能相等，相等说明是自己操作的自己

                      var otherpluginid = otherlinkkey.split(".")[0];
                      var mypluginid    = mylinkkey.split(".")[0]; //不清空同类插件的数据, 比如lb的转发规则，使用了多个同名的监听器，这时候是不应该做清空操作的。

                      if( otherpluginid != mypluginid && otherlinkkey != mylinkkey && linkname == ename[1]  && linkname == tempename[1] )
                      {
                          var otherlinkkeyItem =  $scope.jobVar.filter(cItem => cItem.name == otherlinkkey )[0];
                          var mylinkkeyItem    =  $scope.jobVar.filter(cItem => cItem.name == mylinkkey    )[0];

                          if( otherlinkkey !== mylinkkey && otherlinkkeyItem != undefined && mylinkkeyItem != undefined  && otherlinkkeyItem.value == mylinkkeyItem.value )
                          {
                               data.value = "";
                               vm.optionx[data.name] = undefined
                          }
                      }
                 } 
            });

             //clear list
             angular.forEach($scope.jobVar, function (data, index) {
                 var tempename = vm.extname( data.name ); 

                 //ename[0];    // 变动的框的前缀
                 //ename[1];    // 变动的框的名称
                 //tempename[0] //当前的框的前缀
                 //tempename[1] //当前的框的名称
                 // 我的步骤中有point配置，做一下处理，看是不是需要清空自己
                 if( data['command'] && typeof data['command'] === 'object' && data['command'][0] == 'list' ) //是否配置的list
                 {
                      var bindname = data['command'][1];//绑定的上一步插件的选项名字

                      var otherlinkkey = ename[0] + "." + bindname;
                      var mylinkkey    = tempename[0] + "." + bindname;//这两个值不能相等，相等说明是自己操作的自己

                      if( otherlinkkey != mylinkkey && ename[1] == bindname && tempename[1] == bindname )
                      {
                          var match = 0;
                          angular.forEach($scope.jobVar, function (tempdata, index) {
                              var temp = vm.extname( data.name ); 
                              if( data.name != tempdata.name && temp[1] == bindname && data.value == tempdata.value  )
                              {
                                  match = 1;
                              }
                          });

                          if( match == 0 )
                          {
                              data.value = "";
                              vm.optionx[data.name] = undefined
                          }
                      }
                 } 
            });


            //hide
            angular.forEach($scope.jobVar, function (data, index) {

                 var tempename = vm.extname( data.name ); 
                 if(data['show'] && typeof data['show'][0] === 'string')
                 {
                    if (ename[0] == tempename[0] && data['show'][0] == ename[1]) {
                     var match = false;
                     angular.forEach(data['show'], function (data, index) {
                         if( data == stepvalue && index > 0 )
                         {
                             match = true;
                         }
                     });

                     //if( data['show'][1] == stepvalue )
                     if( match )
                     {
                         vm.selectxhide[data.name] = '0';
                         data.value = "";
                     }
                     else
                     {
                         vm.selectxhide[data.name] = '1';
                         data.value = "_openc3_hide_";
                         if( data.tempvalue != undefined )
                         {
                             data.tempvalue = [];
                         }
 
                     }
                    }
                 } else if (data['show']) {


                    let itemKeysResults = []
                    let selectItem = {}

                    var allkey = [];//show里面涉及到的所有key
                    angular.forEach(data['show'], function (item, index) {
                        angular.forEach(Object.keys(item), function (item, index) {
                            allkey.push( item );
                        });
                    });
                    if(ename[0] === tempename[0] && allkey.find(item => item === ename[1])){
                        angular.forEach(data['show'], function (item, index) {

                            let itemKeysResult = {select: []}
                            itemKeysResult['name'] = Object.keys(item) //其中一组的所有key

                            for (let key in item) {//循环一个分组,小组内是"与"的关系
                                var realkey =  ename[0] + "." + key;
                                selectItem =  $scope.jobVar.filter(cItem => cItem.name == realkey )[0]
                                itemKeysResult['select'].push(!!item[key].find(cItem=> cItem === selectItem.value))
                            }

                            itemKeysResults[index] = itemKeysResult //小组内的匹配结果的数组

                        });
                        angular.forEach(itemKeysResults, function (item) {
                            item.match = !item.select.filter(cItem=> cItem === false).length
                        })

                        if(itemKeysResults.map(item => item.match).filter(cItem => cItem === true ).length > 0) {
                            vm.selectxhide[data.name] = '0';
                            data.value = "";
                            if (data.rawvalue) {
                              data.value = data.rawvalue
                            }
                        } else {
                            vm.selectxhide[data.name] = '1';
                            data.value = "_openc3_hide_";
                            if( data.tempvalue != undefined )
                            {
                                data.tempvalue = [];
                            }
                        }


                   }


                }
            });
        }

        vm.switchMultiple = function (option, type) {
          vm.checkTypeMap[option.name] = !type;
          option.value = '';
        }

        vm.optionxclick = function( stepname , selectIndex )
        {
            vm.selectIndex = selectIndex
            var varDict = {};
            var stepconf;
            vm.stepconfs = []
            var middleAttrConf = $scope.jobVar.filter(item => item['command'] && typeof item['command'] === 'object' && item['command'][0] == 'list' && item.name === stepname)[0]
            angular.forEach($scope.jobVar, function (data, index) {
                varDict[data.name] = data.value;
                vm.selectxrely[data.name] = '0';
                if( data.name == stepname )
                {
                    stepconf = data;
                }
            });

            if( stepconf['rely'] )
            {
                
                var prefix;
                var rawname;
                var ename = vm.extname( stepname );
                prefix = ename[0];
                rawname = ename[1];

                var defect = false;
                angular.forEach(stepconf['rely'], function (data, index) {
                    var checkname = prefix +'.'+ data;
                    if( varDict[checkname] == "" )
                    {
                        vm.selectxrely[checkname] = '1';
                        defect = true;
                    }
                });

                if( defect )
                {
                    vm.optionx[stepname] = [];
                    return;
                }
            }
 
            angular.forEach($scope.jobVar, function (data, index) {
              if (middleAttrConf && middleAttrConf.command && Array.isArray(middleAttrConf.command) && middleAttrConf.command[0] == 'list' && data.name.includes(middleAttrConf.command[1])) {
                vm.stepconfs.push(data.value)
              }
            })

            if(stepconf['command'] && typeof stepconf['command'] === 'object' && stepconf['command'][0] == 'list') {
              const newData = [...new Set(vm.stepconfs)].map(item => {return {name: item, alias:item}})
              vm.optionx[stepname] = newData
              return 
            }

            if( vm.debug == 1 )
            {
                vm.optionx[stepname] = undefined;
            }

            if( vm.optionx[stepname] == undefined )
            {
                vm.selectxloading[stepname] = true;
                $http.post( '/api/ci/v2/c3mc/bpm/optionx', { "bpm_variable": varDict, "stepname": stepname, "jobname":$scope.choiceJob.name } ).success(function(data){
                    if (data.stat){
                        vm.selectxloading[stepname] = false;
                        vm.optionx[stepname] = data.data
                    }else {
                        swal({ title: '获取选项失败', text: data.info, type:'error' });
                    }
                });
 
            }
        }

        // 文件上传
        vm.clickImport = function (option) {
          document.getElementById("bpm-choicefiles").click();
          vm.fileOption = option;
        };

        $scope.upForm = function () {
          var form = new FormData();
          var file = document.getElementById("bpm-choicefiles").files[0];
          form.append('file', file);
          $http({
            method: 'POST',
            url: '/api/job/bpm/attachments',
            data: form,
            headers: { 'Content-Type': undefined },
            transformRequest: angular.identity
          }).success(function (data) {
            if (data.stat) {
             $scope.jobVar.forEach(item => {
              if (item.name === vm.fileOption.name) {
                const valueArr = []
                angular.forEach(data.data, function (value, key) {
                  valueArr.push(`${key}:${value}`)
                })
                item.value = valueArr.join(',')
              }
            })
            }
            else {
              toastr.error("上传失败:" + data.info)
            }
          }).error(function (data) {
            toastr.error("上传失败:" + data)
          })
        };

        vm.jobsloadover = true;
        vm.menu = [];
        vm.reload = function () {
            vm.jobsloadover = false;
            $http.get('/api/job/bpm/menu' ).success(function(data){
                vm.jobsloadover = true;
                if (data.stat){
                    vm.menu = data.data;
                    angular.forEach(vm.menu, function (data, index) {
                        if( data.name == vm.bpmvar._jobname_ )
                        {
                            $scope.choiceJob = data
                        }
                        if( vm.bpmname && data.name == vm.bpmname )
                        {
                            $scope.choiceJob = data
                        }
                    });

                    vm.updateJobDescribe();

                }else {
                    swal({ title:'获取BPM菜单失败', text: data.info, type:'error' });
                }
            });
        };

        vm.jobsloadover = false;
        if( vm.bpmuuid != "0" )
        {
            vm.loadbpmvar();
            vm.loadbpmlog();
            vm.getDeal();
            vm.getsubTaskDetails();
        }
        else
        {
            vm.multitempidx = 1;
            vm.reload();
        }


        vm.varsvalue = {};

        vm.runTask = function( pointuser ){
            var varDict = {};

            const hasValueType = []
            const hasIpValueType = []
            angular.forEach(vm.valias, function (data, index) {
              const isExist = $scope.jobVar.some(item => item.name === index)
              if (isExist) {
                var aliasname = index + "__alias";
                varDict[aliasname] = data;
              }
            });
 
            angular.forEach($scope.jobVar, function (data, index) {
                varDict[data.name] = data.value;
                if (data.value_type && vm.inputValueType.includes(data.value_type)) {
                  hasValueType.push(data)
                }
                if (data.value_type && Array.isArray(data.value_type)) {
                  hasIpValueType.push(data)
                }
            });
            $scope.taskData.variable = varDict;

            $scope.taskData.variable['_sys_opt_'] = {};
            $scope.taskData.variable['_sys_opt_']['optionx']      = vm.optionx;
            $scope.taskData.variable['_sys_opt_']['valias']       = vm.valias;
            $scope.taskData.variable['_sys_opt_']['selectxrely']  = vm.selectxrely;
            $scope.taskData.variable['_sys_opt_']['selectxhide']  = vm.selectxhide;
            $scope.taskData.variable['_sys_opt_']['variable']     = $scope.jobVar;
            $scope.taskData.variable['_sys_opt_']['multitempidx'] = vm.multitempidx;
            const newValible = JSON.parse(JSON.stringify($scope.taskData.variable))
            angular.forEach(newValible['_sys_opt_']['variable'], function (data, index) {
              delete data.errorCheckingInformation
            })
            vm.textareaLoading = {}
            if (vm.errorResult && vm.errorResult!=='') {
              swal({ title:'格式错误', text: `${vm.errorResultLabel}:${vm.errorResult}`, type:'error' });
              return
            }
            resoureceService.work.runJobByName2Bpm(vm.defaulttreeid, {"pointuser": pointuser, "jobname":$scope.choiceJob.name, "bpm_variable": newValible, "variable": {} })
                .then(function (repo) {
                    if (repo.stat){
                        //$state.go('home.history.bpmdetail', {treeid:vm.defaulttreeid,taskuuid:repo.uuid});
                        $state.go('home.bpmcase', {bpmuuid:repo.uuid});
                    }

                 }, function (repo) { });
        };

        vm.reSave = function(dealoption){
            var varDict = {};

            angular.forEach(vm.valias, function (data, index) {
              const isExist = $scope.jobVar.some(item => item.name === index)
              if (isExist) {
                var aliasname = index + "__alias";
                varDict[aliasname] = data;
              }
            });
 
            angular.forEach($scope.jobVar, function (data, index) {
                varDict[data.name] = data.value;
            });
            $scope.taskData.variable = varDict;

            $scope.taskData.variable['_sys_opt_'] = {};
            $scope.taskData.variable['_sys_opt_']['optionx']      = vm.optionx;
            $scope.taskData.variable['_sys_opt_']['valias']       = vm.valias;
            $scope.taskData.variable['_sys_opt_']['selectxrely']  = vm.selectxrely;
            $scope.taskData.variable['_sys_opt_']['selectxhide']  = vm.selectxhide;
            $scope.taskData.variable['_sys_opt_']['variable']     = $scope.jobVar;
            $scope.taskData.variable['_sys_opt_']['multitempidx'] = vm.multitempidx;
            const newValible = JSON.parse(JSON.stringify($scope.taskData.variable))
            angular.forEach(newValible['_sys_opt_']['variable'], function (data, index) {
              delete data.errorCheckingInformation
            })
            if (vm.errorResult && vm.errorResult!=='') {
              swal({ title:'格式错误', text: `${vm.errorResultLabel}:${vm.errorResult}`, type:'error' });
              return
            }
            $http.post( '/api/job/bpm/var/' + vm.bpmuuid, { "bpm_variable": newValible } ).success(function(data){
                if (data.stat){
                    if( dealoption == undefined )
                    {
                        swal({ title: '保存成功', type:'success' });
                    }
                    else
                    {
                        $http.post('/api/job/bpm/deal/' + vm.bpmuuid, { "opinion": dealoption } ).success(function(data){
                            vm.idealloadover = true;
                            setTimeout(function () {
                              $window.location.reload()
                            }, 2000)
                        });
                    }
                }else {
                    swal({ title: '保存失败', text: data.info, type:'error' });
                }
            });
        };

        vm.choiceServer = function () {
                var openChoice = $uibModal.open({
                templateUrl: 'app/components/machine/choiceMachine.html',
                controller: 'ChoiceController',
                controllerAs: 'choice',
                backdrop: 'static',
                size: 'lg',
                keyboard: false,
                bindToController: true,
                resolve: {
                    treeId: function () { return vm.treeid},

                }
            });
            openChoice.result.then(
                function (result) {
                    if (result.length != 0){
                        $scope.choiceShow = true;
                        var machineInfoNew = "";
                        angular.forEach($scope.jobVar, function (value, key) {
                            if( value.name == "ip" )
                            {
                                value.value = result.join(',');
                            }

                        });
 
                    }
                },function (reason) {
                    console.log("error reason", reason)
                }
            );
        };


        vm.jobdescribe = '';
        vm.updateJobDescribe = function() {
            if( $scope.choiceJob == null )
            {
                vm.jobdescribe = '';
                return;
            }
            angular.forEach(vm.menu, function (data, index) {
                if( data.name == $scope.choiceJob.name )
                {
                    if( data.describe == undefined )
                    {
                         vm.jobdescribe = '';
                    }
                    else
                    {
                        vm.jobdescribe = data.describe;
                    }
                }
            });
        };

        vm.loadover = false;

        vm.choiceJobChange = function (value) {
          $scope.choiceJob = value
        }

        $scope.$watch('choiceJob', function () {
            if( vm.bpmuuid != "0" )
            {
                vm.loadover = true;
                return;
            }
 
            if($scope.choiceJob){
                $scope.taskData.jobname = $scope.choiceJob.name;
                $scope.taskData.group = null

                vm.updateJobDescribe();

                vm.dinit();

                vm.loadover = false;
                $http.get('/api/job/bpm/variable/' + $scope.choiceJob.name ).then(
                    function successCallback(response) {

                        if (response.data.stat){
                            vm.vartemp = [];
                            vm.showfromops = '0';
                            angular.forEach(response.data.data, function (value, key) {
                                if( value.name )
                                {
                                    if( value.fromops == '1' )
                                    {
                                        vm.showfromops = '1';
                                    }
                                    if( vm.bpmvar[value.name] != undefined )
                                    {
                                        value.value = vm.bpmvar[value.name] 
                                        if( value.type && value.type == "kvarray" )
                                        {
                                            value.tempvalue = angular.fromJson( value.value );
                                        }
                                        if( value.type && value.type == "selectxm" )
                                        {
                                            value.tempvalue = [];
                                            angular.forEach(value.value.split(","), function (data, idx) {
                                                value.tempvalue.push({"value": data})
                                            });
                                            if( value.tempvalue.length < 1 )
                                            {
                                                value.tempvalue.push({"value": ""})
                                            }
                                        }
                                    }
                                    vm.vartemp.push( value )
                                }
                            });

                            if (vm.vartemp.length == 0){
                                $scope.jobVar = [];
                                $scope.taskData.variable = {};
                            }else {
                                $scope.jobVar = vm.vartemp;

                            }

                            //hide
                            angular.forEach($scope.jobVar, function (data, index) {
                                if(data['show'])
                                {
                                  // show为字符串数组
                                  if (typeof data['show'][0]  === 'string') {
                                    const showCondition = $scope.jobVar.find(item => item.name.includes(data['show']))
                                    if (data['show'].includes(showCondition? showCondition.value: '')) {
                                      vm.selectxhide[data.name] = '1';
                                      data.value = "_openc3_hide_";
                                    }
                                  }  else {
                                    // show为对象数组
                                    const showKeys = []
                                    data['show'].forEach(item => {
                                      if (!showKeys.includes(Object.keys(item))) {
                                        showKeys.push({
                                          key: Object.keys(item)[0],
                                          value: item[Object.keys(item)[0]]
                                        }) 
                                      }
                                    })
                                    showKeys.forEach(item => {
                                      const showValues = $scope.jobVar.filter(cItem => cItem.name.includes(item.key))
                                      item.value.forEach(cItem => {
                                        if (!showValues.every(dItem => dItem.value === cItem)) {
                                          vm.selectxhide[data.name] = '1';
                                          data.value = "_openc3_hide_";
                                        }
                                      })
                                    })
                                  }
                                } 
                            });


                            if( vm.showfromops == '1' )
                            {
                                vm.fromops(1);
                            }

                            vm.loadover = true;
                        }else {
                            toastr.error( "获取变量信息失败："+response.data.info )
                        }
                    },
                    function errorCallback (response){
                        toastr.error( "获取变量信息失败："+response.status )
                    });

            }

        }, true);
    }
})();


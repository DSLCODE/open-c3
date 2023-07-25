(function() {
    'use strict';

    angular
        .module('openc3')
        .controller('DeviceMenuController', DeviceMenuController);

    function DeviceMenuController($state, $http, $scope, treeService, $rootScope ) {
        var vm = this;
        vm.treeid = $state.params.treeid;

        treeService.sync.then(function(){      // when the tree was success.
            vm.nodeStr = treeService.selectname();  // get tree name
        });

        vm.menu = {};
        vm.selectedtimemachine = 'curr';
        vm.timemachine = [];

        vm.cloudList = ['qcloud','aws', 'aliyun','ksyun','google','huawei','ibm', 'idc']
        vm.totalResources = {
          compute: 0,
          networking: 0,
          storage: 0,
          database: 0,
          domain: 0,
          others: 0
        }
        vm.grepdata = {};
        vm.reload = function () {
            vm.loadover = false;
            const queryFilter = convertToQueryParams(vm.deptFilter)
            let newQuery = ''
            if (vm.deptFilter) {
              newQuery = `/api/ci/v2/c3mc/cmdb/menu?treeid=${0}&timemachine=${vm.selectedtimemachine}${queryFilter}`
            }else {
              newQuery = `/api/ci/v2/c3mc/cmdb/menu?treeid=${vm.treeid}&timemachine=${vm.selectedtimemachine}`
            }
            $http.get(newQuery).success(function(data){
                if (data.stat){
                    vm.menu = data.data;
                    vm.loadover = true;
                    let totalArr = JSON.parse(JSON.stringify(data.data))
                    for (let key in totalArr) {
                      vm.totalResources[key] = totalArr[key].map(item=> item.map(cItem => cItem[2]? Number(cItem[2]): 0))
                    }
                    for (let key in  vm.totalResources) {
                      const initialValue = 0;
                      vm.totalResources[key] = vm.totalResources[key].flat(Infinity).reduce((acc, cur) => acc + cur,  initialValue)
                    }
                }else {
                    swal({ title:'获取菜单失败', text: data.info, type:'error' });
                }
            });
        };
        vm.reload();
        vm.reloadtimemachine = function () {
            $http.get('/api/agent/device/timemachine' ).success(function(data){
                if (data.stat){
                    vm.timemachine = data.data;
                }else {
                    swal({ title:'获取时间机器列表失败', text: data.info, type:'error' });
                }
            });
        };
        vm.reloadtimemachine();

        vm.gotosubtype = function (type, subtype, source) {
          sessionStorage.setItem('sourceType', source)
          if (source === 'input') {
            sessionStorage.setItem('globalSearch', vm.grepdata._search_  || '')
          }
            $state.go('home.device.data', {treeid:vm.treeid, timemachine: vm.selectedtimemachine, type: type, subtype: subtype });
        };

        vm.openNewWindow = function( metrics, tab )
        {
            var newurl = '/third-party/monitor/prometheus/graph?g0.expr=' + metrics + '&g0.tab=' + tab + '&g0.stacked=0&g0.show_exemplars=0&g0.range_input=3h';
            window.open( newurl, '_blank')
        }

        $scope.$watch(function () {return $rootScope.deptTreeNode}, function (value) {
          if (value && Object.keys(value).length !== 0) {
            vm.deptFilter = value
            vm.reload()
          }
        })

        function convertToQueryParams (obj) {
          var queryParams = [];
          for (var key in obj) {
            if (obj.hasOwnProperty(key)) {
              var encodedKey = encodeURIComponent(key);
              var encodedValue = encodeURIComponent(obj[key]);
              queryParams.push(encodedKey + '=' + encodedValue);
            }
          }
          return '&' + queryParams.join('&');
        }

    }
})();

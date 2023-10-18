(function() {
    'use strict';

    angular
        .module('openc3')
        .controller('FindTagController', FindTagController);

    function FindTagController($uibModalInstance, $location, $anchorScroll, $state, $http, $uibModal, treeService, ngTableParams, resoureceService, $websocket, $injector, $interval, $scope, cislavestr ) {

        var vm = this;
        vm.treeid = $state.params.treeid;
        vm.projectid = $state.params.projectid;
        var toastr = toastr || $injector.get('toastr');

        vm.cancel = function(){ $uibModalInstance.dismiss()};
        treeService.sync.then(function(){
            vm.nodeStr = treeService.selectname();
        });

        vm.openws = function()
        {
            vm.siteaddr = window.location.host;

            var wsH = "ws://"
            if ( window.location.protocol == 'https:' )
            {
                wsH = "wss://"
            }

            var slavename = vm.project.slave;
            if( cislavestr )
            {
                slavename = 'openc3-srv-docker';
            }
            var urlMySocket = wsH + vm.siteaddr + "/api/ci" + cislavestr + "/slave/"+ slavename  +"/ws?uuid="+ vm.projectid;
            vm.ws = $websocket(urlMySocket);

            vm.logDetail = '';
            vm.ws.onOpen(function (){
               console.log("opening ws");
            });

             vm.ws.onMessage(function (message) {
                 if(  message.data == 'wsresetws' )
                 {
                     vm.logDetail = '';
                 }
                 else
                 {
                     vm.logDetail = vm.logDetail + message.data
                 }

             });

             vm.ws.onError(function (message) {
                 toastr.error('打开日志失败')
             });

        }

        var rc = 0;
        var reRun = $interval(function () {
            rc = rc + 1;
            if( rc < 300 )
            {
                vm.ws.send("H")
            }
        }, 6000);

        $scope.$on('$destroy', function(){
            $interval.cancel(reRun);
            vm.ws.onClose();
        });

        vm.reloadprojectinfo = function(){
            $http.get('/api/ci' + cislavestr + '/project/' + vm.treeid + '/' + vm.projectid ).success(function(data){
                if(data.stat == true) 
                { 
                    vm.project = data.data;
                    if (vm.project.slave){
                        vm.openws();
                    }
                } else {
                    toastr.error( "加载项目信息失败:" + data.info )
                }
            });
        };

        vm.reloadprojectinfo();

        vm.loadfindtags_at_onceover = true;
        vm.findtags_at_once = function(){
            vm.loadfindtags_at_onceover = false;
            $http.put('/api/ci' + cislavestr +'/project/' + vm.treeid + '/' + vm.projectid + '/findtags_at_once' ).success(function(data){
                if(data.stat == true) 
                {
                    vm.loadfindtags_at_onceover = true;
                } else { 
                    toastr.error( "触发寻找tag失败:" + data.info )
                }
            });
        };

    }
})();

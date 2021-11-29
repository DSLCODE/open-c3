(function() {
    'use strict';

    angular
        .module('openc3')
        .controller('KubernetesmanageController', KubernetesmanageController);

    function KubernetesmanageController($scope, $state, $http, treeService, ngTableParams, $injector, $timeout, genericService, $uibModal ) {

        var vm = this;
        var toastr = toastr || $injector.get('toastr');
        vm.treeid = $state.params.treeid;

        vm.selecteClusterId = $state.params.clusterid;
        vm.selecteCluster = {};
        if( vm.selecteClusterId == undefined )
        {
            vm.selecteClusterId = '0'
        }

        vm.selectednamespace = $state.params.namespace;
        if( vm.selectednamespace == undefined )
        {
            vm.selectednamespace = ''
        }

        vm.selectedStat = $state.params.stat;
        if( vm.selectedStat == undefined )
        {
            vm.selectedStat = ''
        }

        vm.namespace = [];

        treeService.sync.then(function(){
            vm.nodeStr = treeService.selectname();
        });

        vm.refreshPage = function (namespace, clusterid, stat ) {
            $state.go('home.kubernetesmanage', {treeid:vm.treeid, namespace: namespace, stat: stat, clusterid: clusterid});
        }

        $scope.choiceNamespace = vm.selectednamespace;
        $scope.choiceStat = vm.selectedStat;
        $scope.choiceClusterId = vm.selecteClusterId;

        $scope.$watch('choiceNamespace', function () {
                vm.refreshPage( $scope.choiceNamespace, $scope.choiceClusterId, $scope.choiceStat )
        });

        $scope.$watch('choiceStat', function () {
                vm.refreshPage( $scope.choiceNamespace, $scope.choiceClusterId, $scope.choiceStat )
        });

        $scope.$watch('choiceClusterId', function () {
                vm.refreshPage( $scope.choiceNamespace, $scope.choiceClusterId, $scope.choiceStat )
        });

        vm.deploymentCount = 0;
        vm.deploymentReady = 0;
        vm.daemonsetCount = 0;
        vm.serviceCount = 0;
        vm.podCount = 0;
        vm.replicasetCount = 0;
        vm.flowlineinfo = {};
 
        vm.loadoverA = false;
        vm.loadoverB = false;
        vm.loadoverC = false;
        vm.loadoverD = false;

        vm.reload = function () {

            vm.loadoverA = false;
            vm.loadoverB = false;
            vm.loadoverC = false;
            vm.loadoverD = false;
            $http.get('/api/ci/ticket/KubeConfig' ).then(
                function successCallback(response) {
                    if (response.data.stat){
                        vm.clusterlist = response.data.data; 
                        $scope.clusterCount = vm.clusterlist.length;

                        if( vm.selecteClusterId > 0 ){
                            angular.forEach(vm.clusterlist, function (value, key) {
                                if( value.id ==  vm.selecteClusterId )
                                {
                                    vm.selecteCluster = value;
                                }
                            });
                        }

                        vm.loadoverA = true;
                    }else {
                        toastr.error( "获取集群列表失败："+response.data.info );
                    }
                },
                function errorCallback (response){
                    toastr.error( "获取集群列表失败: " + response.status )
                });

            if( vm.selecteClusterId <= 0 )
            {
                vm.loadoverB = true;
                vm.loadoverC = true;
                vm.loadoverD = true;
                return;
            }

            $http.get("/api/ci/v2/kubernetes/namespace?ticketid=" + vm.selecteClusterId ).then(
                function successCallback(response) {
                    if (response.data.stat){

                        vm.namespace = response.data.data; 
//TODO 需要更换loadoverC
                        vm.loadoverC = true;
                    }else {
                        toastr.error( "获取集群NAMESPACE数据失败："+response.data.info );
                    }
                },
                function errorCallback (response){
                    toastr.error( "获取集群NAMESPACE数据失败: " + response.status )
                });
 

            $http.get("/api/ci/v2/kubernetes/hpa?ticketid=" + vm.selecteClusterId ).then(
                function successCallback(response) {
                    if (response.data.stat){

                        vm.hpa = response.data.data; 
                        vm.loadoverC = true;
                    }else {
                        toastr.error( "获取集群HPA数据失败："+response.data.info );
                    }
                },
                function errorCallback (response){
                    toastr.error( "获取集群HPA数据失败: " + response.status )
                });
 
            $http.get("/api/ci/project/kubernetes/" + vm.selecteClusterId ).then(
                function successCallback(response) {
                    if (response.data.stat){

                        vm.flowlineinfo = response.data.data; 
                        vm.loadoverD = true;
                    }else {
                        toastr.error( "获取流水线数据失败："+response.data.info );
                    }
                },
                function errorCallback (response){
                    toastr.error( "获取流水线数据失败: " + response.status )
                });
 
 



            $http.get("/api/ci/v2/kubernetes/app?ticketid=" + vm.selecteClusterId + "&namespace=" + vm.selectednamespace + "&status=" + vm.selectedStat ).then(
                function successCallback(response) {
                    if (response.data.stat){

                      //  vm.namespace = response.data.namespace; 

                        vm.deploymentTable = new ngTableParams({count:10}, {counts:[],data:response.data.data.deployment});
                        vm.deploymentCount = response.data.data.deployment.length;
                        vm.deploymentReady = response.data.deploymentready;

                        vm.daemonsetTable = new ngTableParams({count:10}, {counts:[],data:response.data.data.daemonset});
                        vm.daemonsetReady = response.data.daemonsetready;
                        vm.daemonsetCount = response.data.data.daemonset.length;

                        vm.serviceTable = new ngTableParams({count:10}, {counts:[],data:response.data.data.service});
                        vm.serviceCount = response.data.data.service.length; 

                        vm.podTable = new ngTableParams({count:10}, {counts:[],data:response.data.data.pod});
                        vm.podReady = response.data.podready;
                        vm.podRunning = response.data.podrunning;
                        vm.podCount = response.data.data.pod.length;


                        vm.hpaTable = new ngTableParams({count:10}, {counts:[],data:response.data.data.hpa});
                        vm.hpaCount = response.data.data.hpa.length;

                        vm.replicasetTable = new ngTableParams({count:10}, {counts:[],data:response.data.data.replicaset});
                        vm.replicasetReady = response.data.replicasetready;
                        vm.replicasetCount = response.data.data.replicaset.length;


                        vm.jobbatchTable = new ngTableParams({count:10}, {counts:[],data:response.data.data['job.batch']});
                        vm.jobbatchCount = response.data.data['job.batch'].length;


                        vm.statefulsetTable = new ngTableParams({count:10}, {counts:[],data:response.data.data.statefulset});
                        vm.statefulsetCount = response.data.data.statefulset.length;

                        vm.loadoverB = true;
                    }else {
                        toastr.error( "获取集群中应用数据失败："+response.data.info );
                    }
                },
                function errorCallback (response){
                    toastr.error( "获取集群中应用数据失败: " + response.status )
                });

            $http.get("/api/ci/v2/kubernetes/endpoint?ticketid=" + vm.selecteClusterId + "&namespace=" + vm.selectednamespace + "&status=" + vm.selectedStat ).then(
                function successCallback(response) {
                    if (response.data.stat){


                        vm.endpointTable = new ngTableParams({count:10}, {counts:[],data:response.data.data});
                        vm.endpointCount = response.data.data.length;
//TODO  添加新的loadoverX
                        vm.loadoverB = true;
                    }else {
                        toastr.error( "获取集群endpoint失败："+response.data.info );
                    }
                },
                function errorCallback (response){
                    toastr.error( "获取集群endpoint失败: " + response.status )
                });


            $http.get("/api/ci/v2/kubernetes/ingress?ticketid=" + vm.selecteClusterId + "&namespace=" + vm.selectednamespace + "&status=" + vm.selectedStat ).then(
                function successCallback(response) {
                    if (response.data.stat){


                        vm.ingressTable = new ngTableParams({count:10}, {counts:[],data:response.data.data});
                        vm.ingressCount = response.data.data.length;
//TODO  添加新的loadoverX
                        vm.loadoverB = true;
                    }else {
                        toastr.error( "获取集群ingress失败："+response.data.info );
                    }
                },
                function errorCallback (response){
                    toastr.error( "获取集群ingress失败: " + response.status )
                });







        };

        vm.reload();

        vm.edityaml = function (type,name,namespace) {
            $uibModal.open({
                templateUrl: 'app/pages/kubernetesmanage/edityaml.html',
                controller: 'KubernetesEditYamlController',
                controllerAs: 'kubernetesedityaml',
                backdrop: 'static',
                size: 'lg',
                keyboard: false,
                bindToController: true,
                resolve: {
                    treeid: function () {return vm.treeid},
                    type: function () {return type},
                    name: function () {return name},
                    namespace: function () {return namespace},
                    ticketid: function () {return vm.selecteClusterId},
                    clusterinfo: function () {return vm.selecteCluster},
                }
            });
        };

        vm.apply = function () {
            $uibModal.open({
                templateUrl: 'app/pages/kubernetesmanage/apply.html',
                controller: 'KubernetesApplyController',
                controllerAs: 'kubernetesapply',
                backdrop: 'static',
                size: 'lg',
                keyboard: false,
                bindToController: true,
                resolve: {
                    treeid: function () {return vm.treeid},
                    ticketid: function () {return vm.selecteClusterId},
                    clusterinfo: function () {return vm.selecteCluster},
                }
            });
        };

        vm.createDeployment = function (namespace,name) {
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
                    ticketid: function () {return vm.selecteClusterId},
                    clusterinfo: function () {return vm.selecteCluster},
                    namespace: function () {return namespace},
                    name: function () {return name},
                }
            });
        };

        vm.createIngress = function (namespace,name) {
            $uibModal.open({
                templateUrl: 'app/pages/kubernetesmanage/createingress.html',
                controller: 'KubernetesCreateIngressController',
                controllerAs: 'kubernetescreateingress',
                backdrop: 'static',
                size: 'lg',
                keyboard: false,
                bindToController: true,
                resolve: {
                    treeid: function () {return vm.treeid},
                    ticketid: function () {return vm.selecteClusterId},
                    clusterinfo: function () {return vm.selecteCluster},
                    namespace: function () {return namespace},
                    name: function () {return name},
                }
            });
        };

        vm.createService = function (namespace,name) {
            $uibModal.open({
                templateUrl: 'app/pages/kubernetesmanage/createservice.html',
                controller: 'KubernetesCreateServiceController',
                controllerAs: 'kubernetescreateservice',
                backdrop: 'static',
                size: 'lg',
                keyboard: false,
                bindToController: true,
                resolve: {
                    treeid: function () {return vm.treeid},
                    ticketid: function () {return vm.selecteClusterId},
                    clusterinfo: function () {return vm.selecteCluster},
                    namespace: function () {return namespace},
                    name: function () {return name},
                }
            });
        };





        vm.createConfigMap = function (namespace,name) {
            $uibModal.open({
                templateUrl: 'app/pages/kubernetesmanage/createconfigmap.html',
                controller: 'KubernetesCreateConfigMapController',
                controllerAs: 'kubernetescreateconfigmap',
                backdrop: 'static',
                size: 'lg',
                keyboard: false,
                bindToController: true,
                resolve: {
                    treeid: function () {return vm.treeid},
                    ticketid: function () {return vm.selecteClusterId},
                    clusterinfo: function () {return vm.selecteCluster},
                    namespace: function () {return namespace},
                    name: function () {return name},
                }
            });
        };

 
        vm.createDaemonSet = function (namespace,name) {
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
                    ticketid: function () {return vm.selecteClusterId},
                    clusterinfo: function () {return vm.selecteCluster},
                    namespace: function () {return namespace},
                    name: function () {return name},
                }
            });
        };


        vm.describe = function (type,name,namespace) {
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
                    ticketid: function () {return vm.selecteClusterId},
                }
            });
        };

        vm.describedeployment = function (type,name,namespace) {
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
                    type: function () {return type},
                    name: function () {return name},
                    namespace: function () {return namespace},
                    ticketid: function () {return vm.selecteClusterId},
                }
            });
        };


        vm.setimage = function (type,name,namespace,image,container) {
            $uibModal.open({
                templateUrl: 'app/pages/kubernetesmanage/setimage.html',
                controller: 'KubernetesSetImageController',
                controllerAs: 'kubernetessetimage',
                backdrop: 'static',
                size: 'lg',
                keyboard: false,
                bindToController: true,
                resolve: {
                    treeid: function () {return vm.treeid},
                    type: function () {return type},
                    name: function () {return name},
                    image: function () {return image},
                    container: function () {return container},
                    namespace: function () {return namespace},
                    ticketid: function () {return vm.selecteClusterId},
                    clusterinfo: function () {return vm.selecteCluster},
                }
            });
        };

        vm.rollback = function (type,name,namespace,image,container) {
            $uibModal.open({
                templateUrl: 'app/pages/kubernetesmanage/rollback.html',
                controller: 'KubernetesRollbackController',
                controllerAs: 'kubernetesrollback',
                backdrop: 'static',
                size: 'lg',
                keyboard: false,
                bindToController: true,
                resolve: {
                    treeid: function () {return vm.treeid},
                    type: function () {return type},
                    name: function () {return name},
                    namespace: function () {return namespace},
                    ticketid: function () {return vm.selecteClusterId},
                    clusterinfo: function () {return vm.selecteCluster},
                }
            });
        };

        vm.setreplicas = function (type,name,namespace,replicas) {
            $uibModal.open({
                templateUrl: 'app/pages/kubernetesmanage/setreplicas.html',
                controller: 'KubernetesSetReplicasController',
                controllerAs: 'kubernetessetreplicas',
                backdrop: 'static',
                size: 'lg',
                keyboard: false,
                bindToController: true,
                resolve: {
                    treeid: function () {return vm.treeid},
                    type: function () {return type},
                    name: function () {return name},
                    replicas: function () {return replicas},
                    namespace: function () {return namespace},
                    ticketid: function () {return vm.selecteClusterId},
                    clusterinfo: function () {return vm.selecteCluster},
                }
            });
        };

        vm.deleteApp = function (type,name,namespace) {
            $uibModal.open({
                templateUrl: 'app/pages/kubernetesmanage/deleteapp.html',
                controller: 'KubernetesDeleteAppController',
                controllerAs: 'kubernetesdeleteapp',
                backdrop: 'static',
                size: 'lg',
                keyboard: false,
                bindToController: true,
                resolve: {
                    treeid: function () {return vm.treeid},
                    type: function () {return type},
                    name: function () {return name},
                    namespace: function () {return namespace},
                    ticketid: function () {return vm.selecteClusterId},
                    clusterinfo: function () {return vm.selecteCluster},
                }
            });
        };

        vm.createHpa = function (type,name,namespace) {
            $uibModal.open({
                templateUrl: 'app/pages/kubernetesmanage/createhpa.html',
                controller: 'KubernetesCreateHpaController',
                controllerAs: 'kubernetescreatehpa',
                backdrop: 'static',
                size: 'lg',
                keyboard: false,
                bindToController: true,
                resolve: {
                    treeid: function () {return vm.treeid},
                    type: function () {return type},
                    name: function () {return name},
                    namespace: function () {return namespace},
                    ticketid: function () {return vm.selecteClusterId},
                    clusterinfo: function () {return vm.selecteCluster},
                }
            });
        };

        vm.createSecret = function (type,name,namespace) {
            $uibModal.open({
                templateUrl: 'app/pages/kubernetesmanage/createsecret.html',
                controller: 'KubernetesCreateSecretController',
                controllerAs: 'kubernetescreatesecret',
                backdrop: 'static',
                size: 'lg',
                keyboard: false,
                bindToController: true,
                resolve: {
                    treeid: function () {return vm.treeid},
                    type: function () {return type},
                    name: function () {return name},
                    namespace: function () {return namespace},
                    ticketid: function () {return vm.selecteClusterId},
                    clusterinfo: function () {return vm.selecteCluster},
                }
            });
        };






        vm.addCluster = function () {
            $uibModal.open({
                templateUrl: 'app/pages/global/ticket/createTicket.html',
                controller: 'CreateTicketController',
                controllerAs: 'createticket',
                backdrop: 'static',
                size: 'lg',
                keyboard: false,
                bindToController: true,
                resolve: {
                    ticketid: function () {},
                    homereload: function () { return vm.reload },
                    type: function () { return 'create' },
                    title: function () { return '添加kubernetes集群' },
                    point: function () { return 'KubeConfig' },
                }
            });

        };

        vm.node = function () {
            $uibModal.open({
                templateUrl: 'app/pages/kubernetesmanage/node.html',
                controller: 'KubernetesNodeController',
                controllerAs: 'kubernetesnode',
                backdrop: 'static',
                size: 'lg',
                keyboard: false,
                bindToController: true,
                resolve: {
                    treeid: function () {return vm.treeid},
                    ticketid: function () {return vm.selecteClusterId},
                    clusterinfo: function () {return vm.selecteCluster},
                }
            });
        };

 
        vm.secret = function () {
            $uibModal.open({
                templateUrl: 'app/pages/kubernetesmanage/secret.html',
                controller: 'KubernetesSecretController',
                controllerAs: 'kubernetessecret',
                backdrop: 'static',
                size: 'lg',
                keyboard: false,
                bindToController: true,
                resolve: {
                    treeid: function () {return vm.treeid},
                    ticketid: function () {return vm.selecteClusterId},
                    clusterinfo: function () {return vm.selecteCluster},
                }
            });
        };

        vm.configMap = function () {
            $uibModal.open({
                templateUrl: 'app/pages/kubernetesmanage/configmap.html',
                controller: 'KubernetesConfigMapController',
                controllerAs: 'kubernetesconfigmap',
                backdrop: 'static',
                size: 'lg',
                keyboard: false,
                bindToController: true,
                resolve: {
                    treeid: function () {return vm.treeid},
                    ticketid: function () {return vm.selecteClusterId},
                    clusterinfo: function () {return vm.selecteCluster},
                }
            });
        };

 
//TODO 清理vm.skip
//TODO 处理CopyProjectByTemplateXXController，和CopyProjectByTemplateController同名引起流水线中通过模版创建报错
        vm.skip = function() {};
        vm.copyProjectByTemplate = function (sourcename, type, name, namespace ) {
            $uibModal.open({
                templateUrl: 'app/pages/kubernetesmanage/copyProjectByTemplate.html',
                controller: 'CopyProjectByTemplateXXController',
                controllerAs: 'copyProjectByTemplate',
                backdrop: 'static',
                size: 'lg',
                keyboard: false,
                bindToController: true,
                resolve: {
                    treeid: function () { return vm.treeid},
                    sourcename: function () { return sourcename},
                    reload : function () { return vm.reload},
                    cancel : function () { return vm.skip},
                    clusterinfo: function () {return vm.selecteCluster},
                    type: function () { return type},
                    name: function () { return name},
                    namespace: function () { return namespace},
                }
            });
        };


        vm.editconfig = function (treeid, id, name) {
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
                    projectid: function () {return id},
                    treeid: function () {return treeid},
                    name: function () {return name},
                    groupid: function () {},
                }
            });
        };


        vm.deleteProject = function(treeid,id) {
          swal({
            title: "是否要删除该流水线",
            text: "删除后不能恢复",
            type: "warning",
            showCancelButton: true,
            confirmButtonColor: "#DD6B55",
            cancelButtonText: "取消",
            confirmButtonText: "确定",
            closeOnConfirm: true
          }, function(){
            $http.delete('/api/job/jobs/' + treeid + '/_ci_' + id +'_/byname' ).success(function(data){
                if( ! data.stat ){ toastr.error("删除作业配置失败:" + date.info)}
                $http.delete( '/api/ci/project/' + treeid+'/'+ id ).success(function(data){
                    if( ! data.stat ){ toastr.error("删除持续构建配置失败:" + date.info)}
                    $http.delete( '/api/jobx/group/' + treeid + '/_ci_test_' + id +'_/byname'  ).success(function(data){
                        if( ! data.stat ){ toastr.error("删除测试分批组失败:" + date.info)}
                        $http.delete( '/api/jobx/group/' + treeid + '/_ci_online_' + id +'_/byname'  ).success(function(data){
                            if( ! data.stat ){ toastr.error("删除线上分批组失败:" + date.info)}
                            vm.reload();
                        });
                    });
                });
            });
          });
        }

        vm.addNamespace = function () {
            $uibModal.open({
                templateUrl: 'app/pages/kubernetesmanage/createnamespace.html',
                controller: 'KubernetesCreateNamespaceController',
                controllerAs: 'kubernetescreatenamespace',
                backdrop: 'static',
                size: 'lg',
                keyboard: false,
                bindToController: true,
                resolve: {
                    treeid: function () {return vm.treeid},
                    ticketid: function () {return vm.selecteClusterId},
                    clusterinfo: function () {return vm.selecteCluster},
                }
            });
        };

        vm.openOneTab = function (pod, type) {
            var terminalAddr = window.location.protocol + "//" + window.location.host+"/api/ci/kubernetes/pod/shell";
            var s = "?namespace=" + pod.NAMESPACE + '&name=' + pod.NAME + '&clusterid=' + vm.selecteClusterId + '&type=' + type + '&siteaddr=' + window.location.protocol + "//" + window.location.host;
            window.open(terminalAddr+s, '_blank')
        };

        vm.gotoflowline = function (treeid, projectid) {
            $state.go('home.quickentry.flowlinedetail', {treeid:treeid, projectid: projectid});
        };

    }

})();

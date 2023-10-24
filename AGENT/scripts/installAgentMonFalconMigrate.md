# 监控迁移/数据与falcon兼容

```
falcon的agent使用的是1988端口，OpenC3的agent使用的是65110端口。

在迁移过程中，需要部署两个agent，两个agent会各自采集数据。但是有一个数据是比较特殊的，就是本地的采集脚本push到falcon agent本地端口上的数据（1988端口）。

正常的情况下，只要把数据一样的格式上报到1988和65110端口即可。

但是可能falcon已经用了很长一段时间，主机上也有很多的脚本，甚至有本地的二进制程序会push数据到本地的1988端口，这时候全部修改上报逻辑就会很麻烦。


可以通过下面方式进行解决：

curl -L http://your_openc3_addr/api/scripts/installAgentMonFalconMigrate.sh |sudo bash

该脚本安装后，会把原来falcon 1988端口改成1987，然后在1988端口上启动一个服务，当有数据请求1988端口时，会把数据同时提供给1987和65110.
```

# 版本

```
版本包含两个信息: 个位表示状态（0: 数据提供给falcon和open-c3; 1: 数据只给一方，比如只给open-c3） 十位以上表示代码版本

10+: 最开始的版本
20+: 执行/opt/mydan/dan/agent.mon/bin/falcon_migrate_ecs_tag,把ecs监控容器中的标签提取到本地，监控agent处理push数据时追加标签。
30+: 安装兼容程序时，脚本默认启动ecs标签处理的定时任务，5分钟执行一次。
40+: ecs容器的id字符串允许有减号，否则可能很多ecs容器的tag无法识别。
50+: 修复内存泄漏问题，tcp释放问题。【重要】
60+: 添加文件标志 touch  /opt/mydan/dan/agent.mon/falcon_migrate.nofalcon，如果有这个标识就不发送复制数据到falcon了。
     说明falcon下线了。 如果falcon下线（也就是有这个标识文件），那么版本是61。

```

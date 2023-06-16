# 监控迁移/从falcon迁移到Open-C3

## 迁移步骤

```
1. 准备好迁移表格,内容类似于本目录下的debug.csv文件，需要字段在本文'字段要求'中有描述
2. 执行命令 cat debug.csv|./make-data 生成策略到dist中。看情况是否要执行前清理dist目录。
3. 导入策略到系统中，执行命令 ./load-data

```

1. 在前端设置好模版

2. 把模版倒出来
c3mc-mon-rule-dump -t  12  > rule_tpl/mem.memused.percent

3.
修改模版中要修改的，现在应该就是三个变量, 可以参考 load.1min 模版，搜索里面的VAR关键字


## 字段要求

```
要导入的表格，需要包含如下字段:

metric      # 监控指标名称
priority    # 监控级别
func:       # 处理函数，会生成普罗米修斯的for字段
right_value # 阈值

op:         # 比较, 比如 < , > , <= , >= , ==

tags: file.check # tag
```

## 添加识别的字段的方式

```
1. 在前端编辑好策略
2. 导出策略 c3mc-mon-rule-dump -t  12  > rule_tpl/mem.memused.percent
3. 修改导出的策略，用变量替换上需要替换的位置，可以参考load.1min模版中的变量，在里面搜索一下VAR即可看出。

```

# 注
```
导出时候可以根据mark标记只导出部分的数据。 格式为 cat debug.csv |./make-data grep1 grep2 ... grepn

如： 只导出 simplemetric 的策略
cat debug.csv |./make-data simplemetric
```

# 迁移操作
```
#迁移过程中，如果策略很多，普罗米修斯可能会顶不住，可以缓慢导入。
./run-debug  2   100 debug.csv # 导入第二行到100行， 第一行是标题
./run-debug  101 200 debug.csv # 导入第100行到200行
```

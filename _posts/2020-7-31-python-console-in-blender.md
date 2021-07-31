---
layout: post
title: 扩展blender中的python环境
tags: Blender-Reaticle

---
# 安装 pip， Python 包管理工具
复制 [ge-pip.py](https://github.com/pypa/get-pip)到目录blender\2.79\python\bin

在当前目录打开cmd控制台（强烈推荐[Fluent Terminal](http://blog.reaticle.com/2020/06/29/hello-Fluent-Terminal.html)),输入
```shell
./python.exe get-pip.py 
```

# pip管理安装python包
切换目录
```
blender\2.79\python\Scripts
```
打开终端
```shell
./pip.exe install pandas

```

# 其他事项
python包位置：
```shell
blender\2.79\python\lib\site-packages
```
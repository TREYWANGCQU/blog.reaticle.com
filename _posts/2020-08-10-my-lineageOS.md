---
layout: post
title: 编译专属LineageOS
tags: Linux Android

---

## 2. 一些tips


### 2.1. repo同步脚本
网络，，，repo了整整3天，自动重启脚本~~很有用~~（还是不行。。。）
```sh
cat > repo.sh <<EOF
#!/bin/bash
echo "======start repo sync======"
~/bin/repo sync -j4 -c --no-clone-bundle
while [ $? == 1 ]; do
echo "======sync failed, re-sync again======"
sleep 3
~/bin/repo sync -j4 --no-clone-bundle
done
EOF
```
尽快修改国内镜像源，[清华大学源](https://mirrors.tuna.tsinghua.edu.cn/help/lineageOS/)，操作已经有了```大的变化```：
- 把[default.xml](https://github.com/LineageOS/android)fork到[自己](https://github.com/TREYWANGCQU/android)目录做清华源对应修改
- 修改.repo/manifests.git/config下```origin```地址

```html
    [remote "origin"]
        url = https://github.com/TREYWANGCQU/android
```

或者更简单地,repo修改为
```shell
repo init -u git://github.com/TREYWANGCQU/android.git -b lineage-18.1
repo sync
repo sync -c -j8 --force-sync --no-clone-bundle
```

- 终于愉快地```repo sync```命令了


### 2.2. 提取手机厂商vendor信息（硬件不同，驱动不动）
[官方文档](https://wiki.lineageos.org/extracting_blobs_from_zips.html)太重要了，勿必明白

确定厂商系统包类型
- Block-based OTA: 根目录下有一个叫```system.transfer.list```,和极小的```system```(或者没有system这个文件夹)
- File-based OTA：根目录下没有一个叫```system.transfer.list```
- Payload-based OTA：线刷包，暂不考虑

Block-based OTA的提取步骤

基本根据在```system.transfer.list```，没有些文件需要额外[步骤](https://wiki.lineageos.org/extracting_blobs_from_zips.html)

Create a temporary directory and move there:
```shell
cd [你的目录]/Android/lineage
mkdir android/system_dump/
cd android/system_dump/
```
Extract system.transfer.list and system.new.dat(有遇到后缀是.dat.br需要 brotli，详见[说明](https://wiki.lineageos.org/extracting_blobs_from_zips.html)):
```shell
unzip path/to/device-*.zip system.transfer.list system.new.dat
```z
用sdat2img打包镜像并挂载
```shell
git clone https://github.com/xpirt/sdat2img
python sdat2img/sdat2img.py system.transfer.list system.new.dat system.img
mkdir system/
sudo mount system.img system/
```

## 2.2 Recovery img

fastboot ```drivers``` !!! 
```shell
adb reboot bootloader # 进入fastboot模式
fastboot devices #注意需要正确的驱动

```



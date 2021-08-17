---
layout: post
title: Build termux as a system app for your phone
tags: Linux Android

---

## 1. AIMS
when termux is a system app, I could
- hide rooted state but 
- still modify hosts to block Ads;
- manage apps;
- et al.

## 2. MY CONDITIONS

- Device: MEIZU 17
- Android: 11
- [Termux](https://github.com/termux/termux-app): 0.117
- Windows 10

## 3. MAIN STEPS

### 3.1. Pre-Requirements
- [Android Studio](https://developer.android.com/studio/): SDK for Android 11.0(R), NDK, et al.
- Rooted state
- [Platform-tools](https://developer.android.com/studio/releases/platform-tools) for Windows

### 3.2. Git clone codes
Minor amendments are:
- Adding extra permissions according to [@agnostic-apollo ](https://github.com/termux/termux-app/issues/2222#issuecomment-898875249)
- ~~Changing gradle maven for users from China~~

```shell 
git clone https://github.com/termux/termux-app.git
#or
#git clone https://github.com/TREYWANGCQU/termux-app.git
```

### 3.3. Build apk for your device
It is noted that **Bootstrap lib** is varying from your devices. That is exactly the reason why I faced failure when I directly moved termux to system directory. the arm libs could be:
- x86
- x86_64
- armeabi-v7a
- arm64-v8a

In my issue, it is **arm64-v8a**. 

The soluction is simple: just [running apps on the hardware device](https://developer.android.com/studio/run/device.html)

### 3.4. Move apk to system directory

It is easy to find the apk path of Termux via [AndroidApkAnalyzer](https://github.com/MartinStyk/AndroidApkAnalyzer)

Then,
```shell
adb root 
adb shell #enter shell
mkdir -p /system/priv-app/Termux
cp -r /data/app/~~......=\=/[com.termux]/base.apk /system/app/Termux # fail to remove to priv-app
cp /data/app/~~......=\=/[com.termux]/lib/arm64  /system/lib
chmod 755 /system/priv-app/Termux
chmod 755 /system/priv-app/Termux/* 
chmod 655 /system/lib/*
exit 
adb uninstall com.termux
reboot
```

### 3.5. ~~Unroot~~ Hide root
Change a special su name to hide **root**
```shell
mv /system/xbin/su /system/xbin/lu.me.haha.reaticle
``` 
Create a symbol soft link to Termux directory
```shell
sh -s /system/xbin/lu.me.haha.reaticle /data/data/com.termux/files/usr/bin su
```

### 3.6. The results

![Termux_system](/assets/img/termux_system.png)


## Comments

However,  it seems step 3.5 is all enough...(ー_ー)!! 
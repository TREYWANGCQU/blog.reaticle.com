---
title: Tips to Unexpected Problems When Using Termux
layout: post
tags: Andriod Linux
---

## 1 Storage Permission
Why did ``` termux keep losing permission ``` even if  ``` termux-setup-storage ``` runs again after again?

**Solution**:  
* go to termux app info in **android settings** 
* **disable storage/media files permission**
*  and run **termux-setup-storage** again

Ref: <https://www.reddit.com/r/termux/comments/o98ulg/keep_losing_permission/>

## 2 ```sshd``` stoped again and again 
info:
* Android 11,  Flyme,  meizu 17 device
* termux 0.117

Problem like

```shell
u0_a383@localhost sshd
#nothing happen
u0_a383@localhost nmap localhost
#you won't find 8022 port
u0_a383@localhost sshd -d
#It seems good. 8022 port is verfied. But stopping is again once a connecting from ssh client
```

**Solution**:

* Add **ListenAddress 0.0.0.0:65522**(any port over 6000 seems OK) to _/data/data/com.termux/files/usr/etc/ssh/sshd_config
* Run **sshd -d** again.


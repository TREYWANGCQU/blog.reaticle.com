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

## 2 Termux can't exec daemon serve 
info:
* Android 11,  Flyme,  meizu 17 device
* termux 0.117

Problem like

```shell
sshd
#nothing happen
nmap localhost
#you won't find 8022 port
adb devices
#daemon not running and starting again and again
```

**Solution**:

* Run **sshd -d** 
* Run **adb nodaemon server**

## 3 Fail to gem install  Nokogiri 
**Solution**:

```shell
pkg install ruby clang make pkg-config libxslt
gem install nokogiri --platform=ruby -- --use-system-libraries
```
## 4 Permission denied to get **/proc/version** when run " bundle exec jekyll serve"
**Solution**:
* Ignore permission error of /proc/version, see [here](https://github.com/jekyll/jekyll/pull/7267)
* bundle ```bundle show jekyll``` to find the file named ``` jekyll--.-.-(version)/lib/jekyll/utils/platform.rb``` 
```ruby
     @proc_version ||=
          begin
            Pathutil.new("/proc/version").read
          rescue Errno::ENOENT, Errno::EACCES
            nil
          end
      end
```
## 5 visit jekyll serve from network 
```
bundle exec jekyll serve -w --host=0.0.0.0
```

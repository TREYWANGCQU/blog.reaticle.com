---
layout: post
title: Set a Proxy for Terminal
tags: Linux

---

# The directory
Nothing you can do before you enter the correct file directory
```shell
#home directory
cd ~/
# print work directory
pwd

```

# checkout shells
``` shell
cat /etc/shells 
chsh -s /bin/zsh
```
# Proxy
```shell
#export: built-in utility of Linux Bash shell. 
#display all the exported environment 
export -p 
#proxy


proxy_http=username:password@proxy-host:port
export https_proxy=user:pass@my.proxy.server:port


#export is not working when using curl. You can add -c like
sh -c "$(curl -c HTTP_PROXY=user:pass@my.proxy.server:port https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)"

# Oh-my-zsh
More doc is [here](https://github.com/ohmyzsh/ohmyzsh)
powerline font is [here](https://github.com/powerline/fonts)
### helpful plugins
* zsh-autosuggestions->[LINK](https://github.com/zsh-users/zsh-autosuggestions)
*zsh-syntax-highlighting->[LINK](https://github.com/zsh-users/zsh-syntax-highlighting)


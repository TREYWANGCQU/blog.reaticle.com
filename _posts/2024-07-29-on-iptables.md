---
layout: post

title: on nftables/iptalbes for openwrt
author: Y.WANG
tags: openwrt
lang: cn
mathjax: true
---

# 安装模块

重要模块为**kmod-nft-tproxy**

```bash
opkg update
opkg install kmod-nft-tproxy
```
# 设置策略路由标签
经测试，与mwan3的hook不冲突，注意自启使标签保持有效
```bash
 ip rule add fwmark 1 table 100
 ip route add local 0.0.0.0/0 dev lo table 100
```

 # 配置文件
配置文件目录为** /etc/nftables.d/v2ray.nft **
```json
chain user_proxy_eprerouting {
        type filter hook prerouting priority 0;policy accept;
        ip daddr {127.0.0.1/32,224.0.0.0/4,255.255.255.255/32} return
        ip daddr 192.168.120.1/24 return
        ip6 daddr {::1, fe80::/10, fd15::/10} return
        ip saddr {192.168.120.11,192.168.120.12,192.168.120.131,192.168.120.132} meta l4proto {tcp, udp} meta mark set 1    tproxy ip to :10810 accept 
   ip saddr 192.168.120.1/24 return
}
```
# 重启防火墙
service firewall restart 
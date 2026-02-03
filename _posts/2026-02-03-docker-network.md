---
layout: post
lang: cn
title: docker network
date: 2026-02-03
tags: docker linux
mathjax: false

---

## 1 macvlan

给容器分配与局域网同网段的 IP，并直接被局域网其他设备访问（无需端口映射）。\
绕过默认 Linux bridge + NAT 的路径，网络行为更接近 **“直连网卡”** ，通常延迟更低、吞吐更高（接近物理网络）。\
适合传统应用迁移、需要“在 LAN 内被当成独立设备”的服务（例如某些需要广播/组播发现、或对端口占用敏感的服务）。

---

## 2 bridge（默认 docker0）

地址与可达性：bridge 下容器通常在私有网段，通过端口映射对外；macvlan 下容器直接在物理网段，有独立 IP、无需端口映射。\
性能路径：bridge 常经由 bridge 转发与 iptables/NAT；macvlan 不走 NAT，直接二层出入父接口，因此开销更小、延迟更低的描述更常见。\
运维与安全：bridge 把容器藏在主机后面更“收敛”；macvlan 把容器暴露到物理网络里，等同新增了**一台台 LAN 主机**，需要你按“真实主机”去做 DHCP/IP 规划、ACL/防火墙策略与资产管理。

---

## 3 host（共享主机网络栈）

隔离与端口：host 模式容器与宿主机共享 IP、端口空间，容易端口冲突；macvlan 给容器独立 IP/端口空间，冲突少。\
网络身份：host 对外仍是“宿主机那台设备”；macvlan 对外是“多台设备”（每个容器一个 MAC/IP）

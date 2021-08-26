---
layout: post
title: Private DNS
tags: Linux

---

## 1. AIMS

da da da da- kill ads and ...


## 2. CONDITIONS
- DNS server: [AdGuard Home](https://github.com/AdguardTeam/AdGuardHome) is adopted as the DNS server here.
- VPS (Virtual machine): [Microsoft Azure](https://azure.microsoft.com/) for a Public IP address
- Operating System: Linux (ubuntu 20.04)
- Domain: dns.XXX.com (Registrar [Godaady](https://www.godaddy.com/))
- SSL certificate:  [CertBot](https://certbot.eff.org/)

## 3. METHODS
### 3.1. Install AdGuard Home server
```shell
curl -s -S -L https://raw.githubusercontent.com/AdguardTeam/AdGuardHome/master/scripts/install.sh | sh -s -- -v
```
### 3.2. Open the ports
Add inbound security rule including 853 (DoT, DoH), 443(HTTPS), 53 (DNS.UDP),3000(default port for AdGuard Home server)
Then, AdGuard Home is available on the following addresses:
- Go to http://127.0.0.1:3000
- Go to http://dns.XXXX:3000

But it addresses would get changed after encryption

### 3.3. DNS Management
make new records on Godaddy

### 3.4. Get SSL certificate
see the [instruction](https://certbot.eff.org/lets-encrypt/ubuntufocal-other) on CertBot

Get  two files:
- fullchain.pem – your PEM-encoded SSL certificate.
- privkey.pem – your PEM-encoded private key.

Remeber to renew certificate!

### 3.5. Configure AdGuard Home
Open AdGuard Home web interface and go to settings.
Scroll down to the "Encryption" settings. see [here](https://github.com/AdguardTeam/AdGuardHome/wiki/Encryption).

Then, AdGuard Home is available on the following addresses:
- Go to https://127.0.0.1
- Go to https://dns.XXX.com

### DNS blocklists
As you wish

## COMMENTS
Why does it fail to connect private DNS in android 11?

One possible solution:

Add icmp protocol to VPS. Ping it

| port        | Protocol        | Source | Name |
|:-------------|:------------------|:------|:------|
| Any           | ICMP             | Any  | ping  |



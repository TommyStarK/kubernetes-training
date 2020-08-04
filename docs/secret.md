# kubernetes-training

## `Secret`

Kubernetes Secrets let you store and manage sensitive information, such as passwords, OAuth tokens, and ssh keys. Storing confidential information in a `Secret` is safer and more flexible than putting it verbatim in a Pod definition or in a container image

To use a secret, a Pod needs to reference the secret. A secret can be used with a Pod in three ways:

- As files in a volume mounted on one or more of its containers.
- As container environment variable.
- By the kubelet when pulling images for the Pod.

Kubernetes helps keep your Secrets safe by making sure each Secret is only distributed to the nodes that run the pods that need access to the Secret. Also, on the nodes themselves, Secrets are always stored in memory and never written to physical storage, which would require wiping the disks after deleting the Secrets from them.

### Demo

#### 1. **`Secret` volume**

Now, you’ll create your own little Secret. You’ll improve your fortune-serving Nginx container by configuring it to also serve HTTPS traffic. For this, you need to create a certificate and a private key. The private key needs to be kept secure, so you’ll put it and the certificate into a Secret.

```bash
# generate private key
❯ openssl genrsa -out https.key 2048

# generate the certificate
❯ openssl req -new -x509 -key https.key -out https.cert -days 3650 -subj /CN=www.app.fortune.com
```

Create the `Secret` from those two files.

```bash
❯ kubectl create secret generic fortune-https --from-file=https.key --from-file=https.cert
```

:star: The contents of a Secret’s entries are shown as Base64-encoded strings

Now we need to create the `ConfigMap` holding the updated Nginx configuration which will enable serving HTTPS traffic:

```bash
❯ kubectl apply -f k8s/configmap/fortune_https_config.yaml
```

and then we can create our pod:

```bash
❯ kubectl apply -f k8s/pod/fortune_https_with_secret_and_config_map.yaml
```

Once the pod is running, you can see if it’s serving HTTPS traffic by opening a port-forward tunnel to the pod’s port 443 and using it to send a request to the server with curl:

```bash
❯ kubectl port-forward fortune 8443:443
Forwarding from 127.0.0.1:8443 -> 443
Forwarding from [::1]:8443 -> 443
```

In a different terminal

```bash
# If you configured the server properly, you should get a response
❯ curl https://localhost:8443 -k
Fine day to work off excess energy.  Steal something heavy.

# You can check the server’s certificate to see if it matches the one you generated earlier.
# This can also be done with curl by turning on verbose logging using the -v option,
❯ curl https://localhost:8443 -k -v
*   Trying ::1...
* TCP_NODELAY set
* Connected to localhost (::1) port 8443 (#0)
* ALPN, offering h2
* ALPN, offering http/1.1
* successfully set certificate verify locations:
*   CAfile: /etc/ssl/cert.pem
  CApath: none
* TLSv1.2 (OUT), TLS handshake, Client hello (1):
* TLSv1.2 (IN), TLS handshake, Server hello (2):
* TLSv1.2 (IN), TLS handshake, Certificate (11):
* TLSv1.2 (IN), TLS handshake, Server key exchange (12):
* TLSv1.2 (IN), TLS handshake, Server finished (14):
* TLSv1.2 (OUT), TLS handshake, Client key exchange (16):
* TLSv1.2 (OUT), TLS change cipher, Change cipher spec (1):
* TLSv1.2 (OUT), TLS handshake, Finished (20):
* TLSv1.2 (IN), TLS change cipher, Change cipher spec (1):
* TLSv1.2 (IN), TLS handshake, Finished (20):
* SSL connection using TLSv1.2 / ECDHE-RSA-AES256-GCM-SHA384
* ALPN, server accepted to use http/1.1
* Server certificate:
*  subject: CN=www.app.fortune.com
*  start date: Aug  4 09:30:48 2020 GMT
*  expire date: Aug  2 09:30:48 2030 GMT
*  issuer: CN=www.app.fortune.com
*  SSL certificate verify result: self signed certificate (18), continuing anyway.
> GET / HTTP/1.1
> Host: localhost:8443
> User-Agent: curl/7.64.1
> Accept: */*
> Referer:
>
< HTTP/1.1 200 OK
< Server: nginx/1.19.1
< Date: Tue, 04 Aug 2020 09:52:31 GMT
< Content-Type: text/html
< Content-Length: 60
< Last-Modified: Tue, 04 Aug 2020 09:52:11 GMT
< Connection: keep-alive
< ETag: "5f292fcb-3c"
< Accept-Ranges: bytes
<
Fine day to work off excess energy.  Steal something heavy.
* Connection #0 to host localhost left intact
* Closing connection 0
```

The secret volume uses an in-memory filesystem (tmpfs) for the Secret files. You can see this if you list mounts in the container:

```bash
❯ kubectl exec fortune -c web-server -- mount |grep certs
tmpfs on /etc/nginx/certs type tmpfs (ro,relatime)
```

#### 2. **Exposing a Secret’s entry as an environment variable**

This is almost exactly like when you set an environment variable using a `ConfigMap`, except that this time you’re referring to a `Secret` by using `secretKeyRef` instead of `configMapKeyRef`.

```yaml
env:
- name: FOO_SECRET
  valueFrom:
    secretKeyRef:
      name: secret-name
      key: foo
```

:star: Think twice before using environment variables to pass your Secrets to your container, because they may get exposed inadvertently. To be safe, always use secret volumes for exposing Secrets.

#### 3. **image pull Secrets**

To have Kubernetes use the `Secret` when pulling images from your private Docker Hub repository, all you need to do is specify the Secret’s name in the pod spec:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: private-pod 
spec:
  imagePullSecrets:
  - name: mydockerhubsecret 
  containers:
  - image: username/private:tag
    name: main
```

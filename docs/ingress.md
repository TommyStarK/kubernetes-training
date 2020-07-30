
# kubernetes-training

## `Ingress`

`Ingress` exposes HTTP and HTTPS routes from outside the cluster to services within the cluster. Traffic routing is controlled by rules defined on the Ingress resource.

An Ingress may be configured to give Services externally-reachable URLs, load balance traffic, terminate SSL / TLS, and offer name based virtual hosting. An Ingress controller is responsible for fulfilling the Ingress, usually with a load balancer, though it may also configure your edge router or additional frontends to help handle the traffic.

An Ingress does not expose arbitrary ports or protocols. Exposing services other than HTTP and HTTPS to the internet typically uses a service of type Service.Type=NodePort or Service.Type=LoadBalancer.

:star: Each LoadBalancer service requires its own load balancer with its own public IP address, whereas an Ingress only requires one, even when providing access to dozens of services. When a client sends an HTTP request to the Ingress, the host and path in the request determine which service the request is forwarded to.

### demo

#### 1. **local**

Start minikube with the ingress addon enabled

```bash
❯ minikube addons enable ingress

❯ minikube start
```

Now we are going to create the Ingress, the Service and the ReplicaSet to have 3 pods instances of our application up and running.

```bash
# Since everything is based on labels we can create 
# the resources in any order we want.
❯ kubectl apply -f k8s/service/dummy_node_app_nodeport.yaml
service/nodeport-dummy-node-app created

❯ kubectl apply -f k8s/replicaset/
replicaset.apps/replica-set-dummy-node-app created

❯ kubectl apply -f k8s/ingress/
ingress.extensions/ingress-minikube-dummy-node-app created
```

:star: You can specify a path towards a directory, `kubectl` will apply all `yaml` files within the directory.

To access your service through http://app.dummy.com, you’ll need to make sure the domain name resolves to the IP of the Ingress controller.

To look up the IP, you need to list Ingresses:

```bash
❯ kubectl get ingress
NAME                              CLASS    HOSTS           ADDRESS        PORTS   AGE
ingress-minikube-dummy-node-app   <none>   app.dummy.com   192.168.64.4   80      3m59s
```

Once you know the IP, you can then either configure your DNS servers to resolve `app.dummy.com` to that IP.

As we run it locally we must edit our `/etc/hosts`

```bash
❯ sudo -- sh -c 'echo "\n192.168.64.4 app.dummy.com\n" >> /etc/hosts'
```

Now we can access the service with curl

```bash
❯ curl http://app.dummy.com
You have reached replica-set-dummy-node-app-p87hg

❯ curl http://app.dummy.com
You have reached replica-set-dummy-node-app-5xnf6

❯ curl http://app.dummy.com
You have reached replica-set-dummy-node-app-b2blr
```

The client first performed a DNS lookup of `app.dummy.com`, and the DNS server (or the local operating system) returned the IP of the Ingress controller. The client then sent an HTTP request to the Ingress controller and specified `app.dummy.com` in the Host header. From that header, the controller determined which service the client is trying to access, looked up the pod IPs through the Endpoints object associated with the service, and forwarded the client’s request to one of the pods.

**MAPPING DIFFERENT SERVICES TO DIFFERENT PATHS OF THE SAME HOST**

You can map multiple paths on the same host to different services. 

In this case, requests will be sent to two different services, depending on the path in the requested URL. Clients can therefore reach two different services through a single IP address (that of the Ingress controller).

```yaml
apiVersion: extensions/v1beta1
kind: Ingress
metadata:
  name: ingress-minikube-dummy-node-app
spec:
  rules:
    - host: app.dummy.com
      http:
        paths:
          - path: /dummy
            backend:
              serviceName: nodeport-dummy-node-app
              servicePort: 80
          - path: /foo
            backend:
              serviceName: foo
              servicePort: 80
```

**MAPPING DIFFERENT SERVICES TO DIFFERENT HOSTS**

Similarly, you can use an Ingress to map to different services based on the host in the HTTP request instead of (only) the path.

Requests received by the controller will be forwarded to either service foo or bar, depending on the Host header in the request (the way virtual hosts are handled in web servers). DNS needs to point both the foo.example.com and the bar.exam- ple.com domain names to the Ingress controller’s IP address.

```yaml
apiVersion: extensions/v1beta1
kind: Ingress
metadata:
  name: ingress-minikube-dummy-node-app
spec:
  rules:
    - host: app.dummy.com
      http:
        paths:
          - path: /
            backend:
              serviceName: nodeport-dummy-node-app
              servicePort: 80
    - host: foo.dummy.com
      http:
        paths:
          - path: /
            backend:
              serviceName: foo
              servicePort: 80
```

#### 2. **Configuring Ingress to handle TLS traffic**

When a client opens a TLS connection to an Ingress controller, the controller terminates the TLS connection. The communication between the client and the controller is encrypted, whereas the communication between the controller and the backend pod isn’t.

The application running in the pod doesn’t need to support TLS. For example, if the pod runs a web server, it can accept only HTTP traffic and let the Ingress controller take care of everything related to TLS. 

To enable the controller to do that, you need to attach a certificate and a private key to the Ingress. The two need to be stored in a Kubernetes resource called a Secret, which is then referenced in the Ingress manifest.

```bash
❯ openssl genrsa -out tls.key 2048
Generating RSA private key, 2048 bit long modulus
...........................+++
..+++
e is 65537 (0x10001)

❯ openssl req -new -x509 -key tls.key -out tls.cert -days 360 -subj /CN=app.dummy.com

❯ kubectl create secret tls tls-secret --cert=tls.cert --key=tls.key
secret/tls-secret created
```

Now we can apply the new configuration of the Ingress

```bash
❯ kubectl apply -f k8s/ingress/dummy_node_app_minikube_tls.yaml
ingress.extensions/ingress-minikube-dummy-node-app configured
```

and then use HTTPS

```bash
# Using -k option
# This option allows curl to proceed and operate even  
# for server connections otherwise considered insecure
❯ curl -k -v https://app.dummy.com

*   Trying 192.168.64.4...
* TCP_NODELAY set
* Connected to app.dummy.com (192.168.64.4) port 443 (#0)
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
* SSL connection using TLSv1.2 / ECDHE-RSA-AES128-GCM-SHA256
* ALPN, server accepted to use h2
* Server certificate:
*  subject: CN=app.dummy.com
*  start date: Jul 29 10:57:52 2020 GMT
*  expire date: Jul 24 10:57:52 2021 GMT
*  issuer: CN=app.dummy.com
*  SSL certificate verify result: self signed certificate (18), continuing anyway.
* Using HTTP2, server supports multi-use
* Connection state changed (HTTP/2 confirmed)
* Copying HTTP/2 data in stream buffer to connection buffer after upgrade: len=0
* Using Stream ID: 1 (easy handle 0x7ffed900d600)
> GET / HTTP/2
> Host: app.dummy.com
> User-Agent: curl/7.64.1
> Accept: */*
> Referer:
>
* Connection state changed (MAX_CONCURRENT_STREAMS == 128)!
< HTTP/2 200
< server: nginx/1.17.10
< date: Wed, 29 Jul 2020 11:04:05 GMT
<
You have reached replica-set-dummy-node-app-p87hg
* Connection #0 to host app.dummy.com left intact
* Closing connection 0
```

#### 3. **Signaling when a pod is ready to accept connections**

The pod may need time to load either configuration or data, or it may need to perform a warm-up procedure to prevent the first user request from taking too long and affecting the user experience. 

In such cases you don’t want the pod to start receiving requests immediately, especially when the already-running instances can process requests properly and quickly. It makes sense to not forward requests to a pod that’s in the process of starting up until it’s fully ready.


When a container is started, Kubernetes can be configured to wait for a configurable amount of time to pass before performing the first readiness check. After that, it invokes the probe periodically and acts based on the result of the readiness probe. If a pod reports that it’s not ready, it’s removed from the service. If the pod then becomes ready again, it’s re-added.

Unlike liveness probes, if a container fails the readiness check, it won’t be killed or restarted. This is an important distinction between liveness and readiness probes. Liveness probes keep pods healthy by killing off unhealthy containers and replacing them with new, healthy ones, whereas readiness probes make sure that only pods that are ready to serve requests receive them.

If you take a look at the file [k8s/replicaset/dummy_node_app_with_readiness_probe.yaml](https://github.com/TommyStarK/kubernetes-training/blob/master/k8s/replicaset/dummy_node_app_with_readiness_probe.yaml)
you will see the definition of the readiness probe:

```yaml
readinessProbe:
    exec:
    command:
        - ls
        - /var/ready
```

Your existing pods still have no readiness probe defined. You can see this by listing the pods with kubectl get pods and looking at the READY col- umn. You need to delete the pods and have them re-created by the ReplicationSet. 

The new pods will fail the readiness check and won’t be included as endpoints of the service until you create the `/var/ready` file in each of them.

```bash
❯ kubectl delete -f k8s/replicaset/dummy_node_app.yaml
❯ kubectl apply -f k8s/replicaset/dummy_node_app_with_readiness_probe.yaml

# no pod is ready because there is no /var/ready file
# the readiness check failed
❯ kubectl get pods
NAME                               READY   STATUS    RESTARTS   AGE
replica-set-dummy-node-app-2gwq8   0/1     Running   0          13s
replica-set-dummy-node-app-d84nc   0/1     Running   0          13s
replica-set-dummy-node-app-dmc29   0/1     Running   0          13s

# we can also check the ReplicaSet saying that 0 pods are ready
❯ kubectl get replicaset
NAME                         DESIRED   CURRENT   READY   AGE
replica-set-dummy-node-app   3         3         0       90s

# if we check the endpoinds (pods IPs) attached to the service
❯ kubectl get services
NAME                      TYPE        CLUSTER-IP       EXTERNAL-IP   PORT(S)        AGE
kubernetes                ClusterIP   10.96.0.1        <none>        443/TCP        97d
nodeport-dummy-node-app   NodePort    10.109.205.116   <none>        80:31111/TCP   70m

# we can see there is no endpoint as there is no pod ready
❯ kubectl get endpoints nodeport-dummy-node-app
NAME                      ENDPOINTS   AGE
nodeport-dummy-node-app
```

Now let's create the `/var/ready` file in one pod and see what happens:

```bash
❯ kubectl exec replica-set-dummy-node-app-d84nc -- touch /var/ready

# wait a few seconds and now one pod is ready to accept traffic
❯ kubectl get pods
NAME                               READY   STATUS    RESTARTS   AGE
replica-set-dummy-node-app-2gwq8   0/1     Running   0          7m41s
replica-set-dummy-node-app-d84nc   1/1     Running   0          7m41s
replica-set-dummy-node-app-dmc29   0/1     Running   0          7m41s

❯ kubectl get endpoints nodeport-dummy-node-app
NAME                      ENDPOINTS         AGE
nodeport-dummy-node-app   172.17.0.9:8080   79m
```

If you try access the service as we did just before, you can reach the pod `replica-set-dummy-node-app-d84nc`. If you repeat that command you will notice that only this pod is receiving requests.

```bash
❯ curl -k -v https://app.dummy.com
```

Finally remove the `/var/ready` file and see that the pod is no longer ready, there is no endpoint available attached to the service and our app is now unreachable.

```bash
❯ kubectl exec replica-set-dummy-node-app-d84nc -- rm /var/ready

❯ kubectl get pods
NAME                               READY   STATUS    RESTARTS   AGE
replica-set-dummy-node-app-2gwq8   0/1     Running   0          13m
replica-set-dummy-node-app-d84nc   0/1     Running   0          13m
replica-set-dummy-node-app-dmc29   0/1     Running   0          13m

❯ kubectl get endpoints nodeport-dummy-node-app
NAME                      ENDPOINTS   AGE
nodeport-dummy-node-app               82m

# Now you receive a 503 Service Temporarily Unavailable
❯ curl -k -v https://app.dummy.com

*   Trying 192.168.64.4...
* TCP_NODELAY set
* Connected to app.dummy.com (192.168.64.4) port 443 (#0)
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
* SSL connection using TLSv1.2 / ECDHE-RSA-AES128-GCM-SHA256
* ALPN, server accepted to use h2
* Server certificate:
*  subject: CN=app.dummy.com
*  start date: Jul 29 10:57:52 2020 GMT
*  expire date: Jul 24 10:57:52 2021 GMT
*  issuer: CN=app.dummy.com
*  SSL certificate verify result: self signed certificate (18), continuing anyway.
* Using HTTP2, server supports multi-use
* Connection state changed (HTTP/2 confirmed)
* Copying HTTP/2 data in stream buffer to connection buffer after upgrade: len=0
* Using Stream ID: 1 (easy handle 0x7fe71900d600)
> GET / HTTP/2
> Host: app.dummy.com
> User-Agent: curl/7.64.1
> Accept: */*
> Referer:
>
* Connection state changed (MAX_CONCURRENT_STREAMS == 128)!
< HTTP/2 503
< server: nginx/1.17.10
< date: Wed, 29 Jul 2020 11:52:02 GMT
< content-type: text/html
< content-length: 198
<
<html>
<head><title>503 Service Temporarily Unavailable</title></head>
<body>
<center><h1>503 Service Temporarily Unavailable</h1></center>
<hr><center>nginx/1.17.10</center>
</body>
</html>
* Connection #0 to host app.dummy.com left intact
* Closing connection 0
```

:star: You should always define a readiness probe, even if it’s as simple as sending an HTTP request to the base URL.

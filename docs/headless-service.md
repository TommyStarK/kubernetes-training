# kubernetes-training

## `Headless Service`

For a client to connect to all pods, it needs to figure out the the IP of each individual pod. One option is to have the client call the Kubernetes API server and get the list of pods and their IP addresses through an API call, but because you should always strive to keep your apps Kubernetes-agnostic, using the API server isn’t ideal.

Luckily, Kubernetes allows clients to discover pod IPs through DNS lookups. Usually, when you perform a DNS lookup for a service, the DNS server returns a single IP, the service’s cluster IP. But if you tell Kubernetes you don’t need a cluster IP for your service (you do this by setting the `clusterIP` field to `None` in the service specification), the DNS server will return the pod IPs instead of the single service IP.

Instead of returning a single DNS A record, the DNS server will return multiple A records for the service, each pointing to the IP of an individual pod backing the service at that moment. Clients can therefore do a simple DNS A record lookup and get the IPs of all the pods that are part of the service. The client can then use that information to connect to one, many, or all of them.

### demo

- Create the headless service

First, we spawn 3 new pods instances of our app and the we create the headless service:

```bash
❯ kubectl apply -f k8s/replicaset/dummy_node_app.yaml

❯ kubectl apply -f k8s/service/dummy_node_app_headless_service.yaml

❯ kubectl get services
NAME                              TYPE        CLUSTER-IP   EXTERNAL-IP   PORT(S)          AGE
headless-service-dummy-node-app   ClusterIP   None         <none>        80/TCP,443/TCP   2m25s
kubernetes                        ClusterIP   10.0.0.1     <none>        443/TCP          2d21h
```

The headless service is running and has no ClusterIP, if we describe it we'll see that the service
has pods IPs as the list of endpoints

```bash
❯ kubectl describe services headless-service-dummy-node-app
Name:              headless-service-dummy-node-app
Namespace:         default
Labels:            <none>
Annotations:       kubectl.kubernetes.io/last-applied-configuration:
                     {"apiVersion":"v1","kind":"Service","metadata":{"annotations":{},"name":"headless-service-dummy-node-app","namespace":"default"},"spec":...
Selector:          app=dummy
Type:              ClusterIP
IP:                None
Port:              http  80/TCP
TargetPort:        8080/TCP
Endpoints:         10.4.1.40:8080,10.4.2.70:8080,10.4.2.71:8080
Port:              https  443/TCP
TargetPort:        8443/TCP
Endpoints:         10.4.1.40:8443,10.4.2.70:8443,10.4.2.71:8443
Session Affinity:  None
Events:            <none>

# we can check the pods IPs with the following
❯ kubectl get pods -o wide
NAME                               READY   STATUS    RESTARTS   AGE    IP          NODE                                          NOMINATED NODE   READINESS GATES
replica-set-dummy-node-app-rfpsw   1/1     Running   0          116s   10.4.2.70   gke-k8s-training-default-pool-3088a1f5-rd72   <none>           <none>
replica-set-dummy-node-app-sklkb   1/1     Running   0          117s   10.4.1.40   gke-k8s-training-default-pool-3088a1f5-1fz4   <none>           <none>
replica-set-dummy-node-app-zhvmc   1/1     Running   0          117s   10.4.2.71   gke-k8s-training-default-pool-3088a1f5-rd72   <none>           <none>
```

- Discovering pods through DNS

With your pods ready, you can now try performing a DNS lookup to see if you get the actual pod IPs or not. You’ll need to perform the lookup from inside one of the pods. 

Unfortunately, your dummy-node-app container image doesn’t include the nslookup (or the dig) binary, so you can’t use it to perform the DNS lookup.

```bash
❯ kubectl run dnsutils --image=tutum/dnsutils --generator=run-pod/v1 --command -- sleep infinity
```

Let’s use the newly created pod to perform a DNS lookup:

```bash
❯ kubectl exec dnsutils nslookup headless-service-dummy-node-app
Server:		10.0.0.10
Address:	10.0.0.10#53

Name:	headless-service-dummy-node-app.default.svc.cluster.local
Address: 10.4.1.40
Name:	headless-service-dummy-node-app.default.svc.cluster.local
Address: 10.4.2.70
Name:	headless-service-dummy-node-app.default.svc.cluster.local
Address: 10.4.2.71
```

The DNS server returns two different IPs for the `headless-service-dummy-node-app.default.svc.cluster.local` FQDN. Those are the IPs of the 3 pods that are reporting being ready. You can confirm this by listing pods with `kubectl get pods -o wide`, which shows the pods’ IPs.

- Troubleshooting services

When you’re unable to access your pods through the service, you should start by going through the following list:

    - First, make sure you’re connecting to the service’s cluster IP from within the cluster, not from the outside.
    - Don’t bother pinging the service IP to figure out if the service is accessible (remember, the service’s cluster IP is a virtual IP and pinging it will never work).
    - If you’ve defined a readiness probe, make sure it’s succeeding; otherwise the pod won’t be part of the service.
    - To confirm that a pod is part of the service, examine the corresponding Endpoints object with kubectl get endpoints.
    - If you’re trying to access the service through its FQDN or a part of it (for example, myservice.mynamespace.svc.cluster.local or myservice.mynamespace) and it doesn’t work, see if you can access it using its cluster IP instead of the FQDN.
    - Check whether you’re connecting to the port exposed by the service and not the target port.
    - Try connecting to the pod IP directly to confirm your pod is accepting connections on the correct port.
    - If you can’t even access your app through the pod’s IP, make sure your app isn’t only binding to localhost.

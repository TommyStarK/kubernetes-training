# kubernetes-training

## `Service`

A Kubernetes Service is a resource you create to make a single, constant point of entry to a group of pods providing the same service. Each service has an IP address and port that never change while the service exists. Clients can open connections to that IP and port, and those connections are then routed to one of the pods backing that service. This way, clients of a service don’t need to know the location of individual pods providing the service, allowing those pods to be moved around the cluster at any time.

An abstract way to expose an application running on a set of Pods as a network service.


### demo

- Create a Service for the dummy node app

First we start by running our node app, using the ReplicaSet to spawn 3 pods:

```bash
❯ kubectl apply -f k8s/replicaset/dummy_node_app.yaml
```

Now three pods instances should be up and running

```bash
❯ kubectl get pods
NAME                               READY   STATUS    RESTARTS   AGE
replica-set-dummy-node-app-2mvdw   1/1     Running   0          107s
replica-set-dummy-node-app-fm4nm   1/1     Running   0          107s
replica-set-dummy-node-app-wvtfb   1/1     Running   0          107s
```

Then create the Service to expose those pods and make them reachable from external clients

```bash
❯ kubectl apply -f k8s/service/dummy_node_app.yaml

# and then
❯ kubectl get services
NAME                     TYPE        CLUSTER-IP   EXTERNAL-IP   PORT(S)   AGE
service-dummy-node-app   ClusterIP   10.0.3.114   <none>        80/TCP    30s
# The list shows that the IP address assigned to the service is 10.0.3.114.
# Because this is the cluster IP, it’s only accessible from inside the cluster
```

You can send requests to your service from within the cluster in a few ways:
1. The obvious way is to create a pod that will send the request to the service’s cluster IP and log the response.
You can then examine the pod’s log to see what the service’s response was.
2. You can ssh into one of the Kubernetes nodes and use the curl command.
3. You can execute the curl command inside one of your existing pods through
the kubectl exec command.

Let's remotely execute a curl command from a running container inside one pod and target the ClusterIP

```bash
# if yu run this command multiple times you can see that you are
# reaching pods randomly
❯ kubectl exec replica-set-dummy-node-app-2mvdw -- curl -s http://10.0.3.114
```

:star: You want all requests made by a certain client to be redi- rected to the same pod every time, you can set the service’s sessionAffinity property to ClientIP. This makes the service proxy redirect all requests originating from the same client IP to the same pod.

```yaml
apiVersion: v1
kind: Service
spec:
  sessionAffinity: ClientIP
```

- Discovering services

:star: If you have a frontend pod that requires the use of a backend database server pod, you can expose the backend pod through a service called backend-database and then have the frontend pod look up its IP address and port through the environment variables BACKEND_DATABASE_SERVICE_HOST and BACKEND_DATABASE_SERVICE_PORT.

The `kube-system` namespace there is pod called `kube-dns`, it also includes a corresponding service with the same name.

The `kube-dns` pod runs a DNS server, which all other pods running in the cluster are automatically configured to use (Kubernetes does that by modifying each container’s /etc/resolv.conf file). Any DNS query performed by a process running in a pod will be handled by Kubernetes’ own DNS server, which knows all the services running in your system.

Each service gets a DNS entry in the internal DNS server, and client pods that know the name of the service can access it through its fully qualified domain name (FQDN) instead of resorting to environment variables.

THE FQDN of a service is of the following form:

`<SERVICE_NAME>.<NAMESPACE>.svc.cluster.local`

where `svc.cluster.local` is a configurable cluster domain suffix.

:star: Connecting to a service can be even simpler than that. You can omit the `svc.cluster.local` suffix and even the namespace, when the pod you want to reach is in the same namespace that the one from which you are trying.

```bash
# connect to a running container inside pod
❯ kubectl exec -ti replica-set-dummy-node-app-fm4nm sh

# now you are inside the container
$ curl http://service-dummy-node-app.default.svc.cluster.local
# or
$ curl http://service-dummy-node-app.default
# even
$ curl http://service-dummy-node-app
```

:warning: Curl-ing the service works, but pinging it doesn’t. That’s because the service’s cluster IP is a virtual IP, and only has meaning when combined with the service port.

- Manually configuring service endpoints

If you create a service without a pod selector, Kubernetes won’t even create the Endpoints resource (after all, without a selector, it can’t know which pods to include in the service). It’s up to you to create the Endpoints resource to specify the list of endpoints for the service.

```yaml
apiVersion: v1
kind: Service
metadata:
  # Service's name must match the name of the Endpoints object
  name: external-service
spec:
  ports:
  - port: 80
```

Endpoints are a separate resource and not an attribute of a service. Because you cre- ated the service without a selector, the corresponding Endpoints resource hasn’t been created automatically.

```yaml
apiVersion: v1
kind: Endpoints
metadata:
  name: external-service
subsets:
  - addresses:
    - ip: 11.11.11.11
    - ip: 22.22.22.22
    ports:
    - port: 80
```

The Endpoints object needs to have the same name as the service and contain the list of target IP addresses and ports for the service. After both the Service and the Endpoints resource are posted to the server, the service is ready to be used like any regular service with a pod selector. 

Containers created after the service is created will include the environment variables for the service, and all connections to its IP:port pair will be load balanced between the service’s endpoints.

- Creating an alias for an external service

Instead of exposing an external service by manually configuring the service’s End- points, a simpler method allows you to refer to an external service by its fully qualified domain name (FQDN).

To create a service that serves as an alias for an external service, you create a Service resource with the type field set to `ExternalName`. 

For example, let’s imagine there’s a public API available at api.dummy.com. You can define a service that points to it.

```yaml

apiVersion: v1
kind: Service
metadata:
  name: external-service
spec:
  type: ExternalName
  externalName: someapi.dummy.com
  ports:
  - port: 80
```

:star: After the service is created, pods can connect to the external service through the `external-service.default.svc.cluster.local` domain name (or even external- service)

### Exposing services to external clients

You have a few ways to make a service accessible externally:

1. Setting the service type to NodePort. For a NodePort service, each cluster node opens a port on the node itself (hence the name) and redirects traffic received on that port to the underlying service. The service isn’t accessible only at the internal cluster IP and port, but also through a dedicated port on all nodes.

2. Setting the service type to LoadBalancer, an extension of the NodePort type. This makes the service accessible through a dedicated load balancer, provisioned from the cloud infrastructure Kubernetes is running on. The load balancer redirects traffic to the node port across all the nodes. Clients connect to the service through the load balancer’s IP.

- NodePort

Create a Service of type `NodePort`

:warning: The range of valid ports is 30000-32767

```bash
❯ kubectl apply -f k8s/service/dummy_node_app_nodeport.yaml

# now as we are running GKE cluster we must add firewall rules
❯ gcloud compute firewall-rules create dummy-svc-rule --allow=tcp:31111

# To retrive the external IP of each node
❯ kubectl get nodes -o jsonpath='{ $.items[*].status.addresses[?(@.type=="ExternalIP")].address }'; echo

# it will print something like
34.78.164.233 34.77.213.143

# we can now curl the service by combining externalIP:port
❯ curl http://34.78.164.233:31111
You have reached replica-set-dummy-node-app-tn5q6
❯ curl http://34.77.213.143:31111
You have reached replica-set-dummy-node-app-jp277
```

- Exposing a service through an external load balancer

To create a service with a load balancer in front

```bash
❯ kubectl apply -f k8s/service/dummy_node_app_load_balancer.yaml
```

After you create the service, it takes time for the cloud infrastructure to create the load balancer and write its IP address into the Service object. Once it does that, the IP address will be listed as the external IP address of your service

```bash
❯ kubectl get services
NAME                           TYPE           CLUSTER-IP   EXTERNAL-IP     PORT(S)        AGE   LABELS
load-balancer-dummy-node-app   LoadBalancer   10.0.5.174   35.240.84.135   80:30794/TCP   66s   <none>
```

In this case, the load balancer is available at IP `35.240.84.135`, so you can now access the service at that IP address:

```bash
❯ curl http://35.240.84.135
You have reached replica-set-dummy-node-app-jp277
❯ curl http://35.240.84.135
You have reached replica-set-dummy-node-app-tn5q6
❯ curl http://35.240.84.135
You have reached replica-set-dummy-node-app-8cd7w
```

:star: As you may have noticed, this time you didn’t need to mess with firewalls the way you had to before with the `NodePort` service.

A `LoadBalancer`-type service is a `NodePort` service with an additional infrastructure-provided load balancer. If you use `kubectl describe` to display additional info about the service, you’ll see that a node port has been selected for the service.

When an external client connects to a service through the node port (this also includes cases when it goes through the load balancer first), the randomly chosen pod may or may not be running on the same node that received the connection. An additional network hop is required to reach the pod, but this may not always be desirable.

You can prevent this additional hop by configuring the service to redirect external traffic only to pods running on the node that received the connection. This is done by setting the externalTrafficPolicy field in the service’s spec section:

```yaml
spec:
  externalTrafficPolicy: Local
```

If a service definition includes this setting and an external connection is opened through the service’s node port, the service proxy will choose a locally running pod. If no local pods exist, the connection will hang (it won’t be forwarded to a random global pod, the way connections are when not using the annotation). 

You therefore need to ensure the load balancer forwards connections only to nodes that have at least one such pod.

Using this annotation also has other drawbacks. Normally, connections are spread evenly across all the pods, but when using this annotation, that’s no longer the case.

Imagine having two nodes and three pods. Let’s say node A runs one pod and node B runs the other two. If the load balancer spreads connections evenly across the two nodes, the pod on node A will receive 50% of all connections, but the two pods on node B will only receive 25% each.

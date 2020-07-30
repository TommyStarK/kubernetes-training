# kubernetes-training

## `Pod`

Pods are the smallest deployable units of computing that you can create and manage in Kubernetes.

A Pod is a group of one or more containers, with shared storage/network resources, and a specification for how to run the containers. It allows you to run closely related processes together and provide them with (almost) the same environment as if they were all running in a single container, while keeping them somewhat isolated.

A Pod's contents are always co-located and co-scheduled, and run in a shared context. The shared context of a Pod is a set of Linux namespaces, cgroups, and potentially other facets of isolation.

Kubernetes achieves this by configuring Docker to have all containers of a pod share the same set of Linux namespaces instead of each container having its own set.

Because all containers of a pod run under the same Network and UTS namespaces (we’re talking about Linux namespaces here), they all share the same hostname and network interfaces. 
Similarly, all containers of a pod run under the same IPC namespace and can communicate through IPC.

> In terms of Docker concepts, a Pod is similar to a group of Docker containers with shared namespaces and shared filesystem volumes.

*THE FLAT INTER-POD NETWORK*

All pods in a Kubernetes cluster reside in a single flat, shared, network-address space, which means every pod can access every other pod at the other pod’s IP address. No NAT (Network Address Translation) gateways exist between them. When two pods send network packets between each other, they’ll each see the actual IP address of the other as the source IP in the packet.


### demo

#### 1. **Create a pod from a yaml file**

```bash
❯ kubectl apply -f k8s/pod/dummy_node_app.yaml
```

and communicate with it

```bash
# bind pod's port 8080 to local 8888 port
❯ kubectl port-forward dummy-node-app-manual 8888:8080

# send HTTP request
❯ curl http://localhost:8888

# then check logs with -c to specify the container name
# of which we want the logs from the pod `dummy-node-app-manual`
❯ kubectl logs dummy-node-app-manual -c dummy-node-app
```

#### 2. **Create and manage a pod with labels**

```bash
❯ kubectl apply -f k8s/pod/dummy_node_app_with_labels.yaml

# show pods with labels
❯ kubectl get pods --show-labels
NAME                         READY   STATUS    RESTARTS   AGE     LABELS
dummy-node-app-manual        1/1     Running   0          8m52s   <none>
dummy-node-app-with-labels   1/1     Running   0          2m8s    creation_method=manual,env=test

# add manual label to the first pod
❯ kubectl label pods dummy-node-app-manual creation_method=manual

# overwrite existing label
❯ kubectl label pods dummy-node-app-with-labels env=debug --overwrite

# specify a specifc list of labels
❯ kubectl get pods -L creation_method,env
NAME                         READY   STATUS    RESTARTS   AGE     CREATION_METHOD   ENV
dummy-node-app-manual        1/1     Running   0          14m     manual
dummy-node-app-with-labels   1/1     Running   0          7m40s   manual            debug

# list all pods that includes a label
❯ kubectl get pods -l env
NAME                         READY   STATUS    RESTARTS   AGE
dummy-node-app-with-labels   1/1     Running   0          8m32s

# list all pods that does not include a label
❯ kubectl get pods -l '!env'
NAME                    READY   STATUS    RESTARTS   AGE
dummy-node-app-manual   1/1     Running   0          16m
```

#### 3. **Using labels for categorizing worker nodes and then schedule a pod to specific node**

```bash
# list available nodes
❯ kubectl get nodes
NAME                                          STATUS   ROLES    AGE     VERSION
gke-k8s-training-default-pool-3088a1f5-1fz4   Ready    <none>   3h56m   v1.15.12-gke.2
gke-k8s-training-default-pool-3088a1f5-rd72   Ready    <none>   3h56m   v1.15.12-gke.2

# label node
❯ kubectl label nodes gke-k8s-training-default-pool-3088a1f5-1fz4 random=true

# ensure that the node is labeled
❯ kubectl get nodes -l random=true
NAME                                          STATUS   ROLES    AGE    VERSION
gke-k8s-training-default-pool-3088a1f5-1fz4   Ready    <none>   4h3m   v1.15.12-gke.2

# deploy a pod with node selector
❯ kubectl apply -f k8s/pod/dummy_node_app_with_node_selector.yaml

# show on which node the pod is running
❯ kubectl get pods dummy-node-app-node-selector -o wide
NAME                           READY   STATUS    RESTARTS   AGE     IP          NODE                                          NOMINATED NODE   READINESS GATES
dummy-node-app-node-selector   1/1     Running   0          7m24s   10.4.1.15   gke-k8s-training-default-pool-3088a1f5-1fz4   <none>           <none>
```

#### 4. **Annotate pod**

```bash
❯ kubectl annotate pods dummy-node-app-node-selector test-annotation="this is a test annotation"
```

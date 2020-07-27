# kubernetes-training

## `cluster info`

> Example with minikube

- Get basic infos

```bash
❯ kubectl cluster-info
Kubernetes master is running at https://192.168.64.4:8443
KubeDNS is running at https://192.168.64.4:8443/api/v1/namespaces/kube-system/services/kube-dns:dns/proxy
```

- Dump detailed infos

```bash
❯ kubectl cluster-info dump
```

- More details ...

```bash
# display a complete list of supported resources
❯ kubectl api-resources
# and then you can ask for ...

# get nodes
❯ kubectl get nodes
NAME       STATUS   ROLES    AGE   VERSION
minikube   Ready    master   94d   v1.18.0

# get components status
❯ kubectl get componentstatuses
NAME                 STATUS    MESSAGE             ERROR
controller-manager   Healthy   ok
scheduler            Healthy   ok
etcd-0               Healthy   {"health":"true"}

# get namespaces
❯ kubectl get namespaces
NAME                   STATUS   AGE
default                Active   94d
kube-node-lease        Active   94d
kube-public            Active   94d
kube-system            Active   94d
kubernetes-dashboard   Active   94d
```

- Display CPU/memory comsumption of a GKE cluster

```bash
❯ kubectl top node
NAME                                          CPU(cores)   CPU%   MEMORY(bytes)   MEMORY%
gke-k8s-training-default-pool-3088a1f5-1fz4   90m          4%     610Mi           96%
gke-k8s-training-default-pool-3088a1f5-rd72   166m         8%     655Mi           103%
```

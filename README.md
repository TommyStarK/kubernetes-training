# kubernetes-training

### `cluster info`

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


### `kubectl config`

- View the whole configuration

```bash
❯ kubectl config view
```

```yaml
# Default configuration with minikube
apiVersion: v1
clusters:
- cluster:
    certificate-authority: <HOME>/.minikube/ca.crt
    server: https://192.168.64.4:8443
  name: minikube
contexts:
- context:
    cluster: minikube
    user: minikube
  name: minikube
current-context: ""
kind: Config
preferences: {}
users:
- name: minikube
  user:
    client-certificate: <HOME>/.minikube/profiles/minikube/client.crt
    client-key: <HOME>/.minikube/profiles/minikube/client.key
```

- Get contexts

```bash
❯ kubectl config get-contexts
CURRENT   NAME       CLUSTER    AUTHINFO   NAMESPACE
          minikube   minikube   minikube
```

- Set context

```bash
❯ kubectl config use-context minikube
Switched to context "minikube".
```

- Get current context

```bash
❯ kubectl config current-context
minikube
```

- Delete context or cluster

```bash
# delete a context from the kube config
❯ kubectl config delete-context <CONTEXT_NAME>

# delete a cluster from the kubeconfig
❯ kubectl config delete-cluster <CLUSTER_NAME>
```

- Delete entry from users

```bash
❯ kubectl config unset users.<USER_NAME>
```

## **Kubernetes**


### Pod

- Simplest way to run a container within a pod

```bash
❯ kubectl run dummy --image=tommystark/dummy-node-app --port=8080 --generator=run-pod/v1
```

and then expose it to make it available


```bash
❯ kubectl expose replicationcontroller dummy --type=LoadBalancer --name dummy-http
```

after a few seconds you will see something like (with GKE cluster)

```bash
❯ kubectl get services
NAME         TYPE           CLUSTER-IP   EXTERNAL-IP      PORT(S)          AGE
dummy-http   LoadBalancer   10.0.2.212   104.155.97.253   8080:31103/TCP   8m31s
kubernetes   ClusterIP      10.0.0.1     <none>           443/TCP          142m

# you can now reach your app
❯ curl http://104.155.97.253:8080
```

- Scale up the number of replicas of your pod

```bash
$ kubectl scale rc dummy --replicas=2
```

- Create a pod from a yaml file

```bash
❯ kubectl create -f k8s/pod/basic_dummy_node_app.yaml
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

- Create a pod with labels

```bash
❯ kubectl create -f k8s/pod/dummy_node_app_with_labels.yaml

# show pods with labels
❯ kubectl get pods --show-labels
NAME                         READY   STATUS    RESTARTS   AGE     LABELS
dummy-node-app-manual        1/1     Running   0          8m52s   <none>
dummy-node-app-with-labels   1/1     Running   0          2m8s    creation_method=manual,env=test

# add manual label to the first pod
❯ kubectl label pods dummy-node-app-manual creation_method=manual

# overwrite existing labels
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

# list all pods that does include a label
❯ kubectl get pods -l '!env'
NAME                    READY   STATUS    RESTARTS   AGE
dummy-node-app-manual   1/1     Running   0          16m
```

- Using labels for categorizing worker nodes and then schedule a pod to specific node

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
❯ kubectl create -f k8s/pod/dummy_node_app_with_node_selector.yaml
pod/dummy-node-app-node-selector created

# show `dummy-node-app-node-selector` pod's label and on which node it's running
❯ kubectl get pods dummy-node-app-node-selector -o wide --show-labels
NAME                           READY   STATUS    RESTARTS   AGE     IP          NODE                                          NOMINATED NODE   READINESS GATES   LABELS
dummy-node-app-node-selector   1/1     Running   0          7m24s   10.4.1.15   gke-k8s-training-default-pool-3088a1f5-1fz4   <none>           <none>            <none>
```

- Annotate pod

```bash
❯ kubectl annotate pods dummy-node-app-node-selector test-annotation="this is a test annotation"
```

## Namespaces

- Create a custom namespace

```bash
❯ kubectl create -f k8s/namespace/custom_namespace.yaml
namespace/custom-namespace create
```

- Create a pod in a namespace

```bash
❯ kubectl create -f k8s/pod/basic_dummy_node_app.yaml --namespace custom-namespace
```

- Display pods in a specific namespace

```bash
❯ kubectl get pods --namespace custom-namespace
NAME                    READY   STATUS    RESTARTS   AGE
dummy-node-app-manual   1/1     Running   0          41s
```

- Delete all resources in a namespace

```bash
❯ kubectl delete all --all --namespace custom-namespace
```

- List all pods from all namespaces

```bash
# same goes for replicationcontrollers, services etc etc
❯ kubectl get pods --all-namespaces
```

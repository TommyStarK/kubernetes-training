# kubernetes-training

## `Pod`

- Create a pod from a yaml file

```bash
❯ kubectl create -f k8s/pod/dummy_node_app.yaml
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

- Create and manage a pod with labels

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

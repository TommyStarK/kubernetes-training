# kubernetes-training

## Namespace

Kubernetes supports multiple virtual clusters backed by the same physical cluster. These virtual clusters are called namespaces.

Namespaces are intended for use in environments with many users spread across multiple teams, or projects.

Namespaces provide a scope for names. Names of resources need to be unique within a namespace, but not across namespaces. Namespaces cannot be nested inside one another and each Kubernetes resource can only be in one namespace. Namespaces are a way to divide cluster resources between multiple users.

Most Kubernetes resources (e.g. pods, services, replication controllers, and others) are in some namespaces. However namespace resources are not themselves in a namespace. And low-level resources, such as nodes and persistentVolumes, are not in any namespace.

To see which Kubernetes resources are and aren't in a namespace:

```bash
# In a namespace
❯ kubectl api-resources --namespaced=true
# Not in a namespace
❯ kubectl api-resources --namespaced=false
```

### demo

- Create a custom namespace

```bash
❯ kubectl apply -f k8s/namespace/custom_namespace.yaml
```

- Create a pod in a namespace

```bash
❯ kubectl apply -f k8s/pod/dummy_node_app.yaml --namespace custom-namespace
```

- Display pods in a specific namespace

```bash
❯ kubectl get pods --namespace custom-namespace
NAME                    READY   STATUS    RESTARTS   AGE
dummy-node-app-manual   1/1     Running   0          41s
```

- List all pods from all namespaces

```bash
# same goes for replicationcontrollers, services etc etc
❯ kubectl get pods --all-namespaces
```

- Delete all resources in a namespace

```bash
❯ kubectl delete all --all --namespace custom-namespace
```

- You can permanently save the namespace for all subsequent kubectl commands in that context

```bash
❯ kubectl config set-context --current --namespace=<insert-namespace-name-here>
```

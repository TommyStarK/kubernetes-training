# kubernetes-training

## Namespace

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

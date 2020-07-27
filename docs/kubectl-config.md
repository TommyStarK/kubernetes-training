# kubernetes-training

## `kubectl config`

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
```

- Get current context

```bash
❯ kubectl config current-context
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

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

#### 5. **Passing metadata through the Downward API**

It allows you to pass metadata about the pod and its environment through environment variables or files (in a downwardAPI volume).

The Downward API enables you to expose the pod’s own metadata to the processes running inside that pod. Currently, it allows you to pass the following information to your containers:

- The pod’s name
- The pod’s IP address
- The namespace the pod belongs to
- The name of the node the pod is running on
- The name of the service account the pod is running under 
- The CPU and memory requests for each container
- The CPU and memory limits for each container
- The pod’s labels
- The pod’s annotations

Here is an example of a Pod with those metadata exposed as environment variables

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: downward
spec:
  containers:
  - name: main
    image: busybox
    command: ["sleep", "9999999"]
    resources:
      requests:
        cpu: 15m
        memory: 100Ki
      limits:
        cpu: 100m
        memory: 4Mi
    env:
    - name: POD_NAME
      valueFrom:
        fieldRef:
          fieldPath: metadata.name
    - name: POD_NAMESPACE
      valueFrom:
        fieldRef:
          fieldPath: metadata.namespace
    - name: POD_IP
      valueFrom:
        fieldRef:
          fieldPath: status.podIP
    - name: NODE_NAME
      valueFrom:
        fieldRef:
          fieldPath: spec.nodeName
    - name: SERVICE_ACCOUNT
      valueFrom:
        fieldRef:
          fieldPath: spec.serviceAccountName
    - name: CONTAINER_CPU_REQUEST_MILLICORES
      valueFrom:
        resourceFieldRef:
          resource: requests.cpu
          divisor: 1m
    - name: CONTAINER_MEMORY_LIMIT_KIBIBYTES
      valueFrom:
        resourceFieldRef:
          resource: limits.memory
          divisor: 1Ki
```

Let's schedule this pod and execute a command inside the running container to see those environment variables

```bash
❯ kubectl apply -f k8s/pod/downward_api.yaml

❯ kubectl exec downward env
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
HOSTNAME=downward
CONTAINER_CPU_REQUEST_MILLICORES=15
CONTAINER_MEMORY_LIMIT_KIBIBYTES=4096
POD_NAME=downward
POD_NAMESPACE=default
POD_IP=10.4.2.86
NODE_NAME=gke-k8s-training-default-pool-3088a1f5-rd72
SERVICE_ACCOUNT=default
KUBERNETES_PORT=tcp://10.0.0.1:443
KUBERNETES_PORT_443_TCP=tcp://10.0.0.1:443
KUBERNETES_PORT_443_TCP_PROTO=tcp
KUBERNETES_PORT_443_TCP_PORT=443
KUBERNETES_PORT_443_TCP_ADDR=10.0.0.1
KUBERNETES_SERVICE_HOST=10.0.0.1
KUBERNETES_SERVICE_PORT=443
KUBERNETES_SERVICE_PORT_HTTPS=443
HOME=/root
```

:warning: Read the [Volumes](https://github.com/TommyStarK/kubernetes-training/blob/master/docs/volumes.md) section before going further :warning:

#### 6. **Passing metadata through files in a downwardAPI volume**

If you prefer to expose the metadata through files instead of environment variables, you can define a downwardAPI volume and mount it into your container. You must use a downwardAPI volume for exposing the pod’s labels or its annotations, because neither can be exposed through environment variables.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: downward
  # the labels and annotation will be exposed through the downward api volume
  labels:
    foo: bar
  annotations:
    key1: value1
    key2: |
      multi
      line
      value
spec:
  containers: 
  - name: main
    image: busybox
    command: ["sleep", "9999999"]
    resources:
      requests:
        cpu: 15m
        memory: 100Ki
      limits:
        cpu: 100m
        memory: 4Mi
    volumeMounts:
    - name: downward
      mountPath: /etc/downward
  volumes:
  - name: downward
    downwardAPI:
      items:
      - path: "podName"
        fieldRef:
          fieldPath: metadata.name
      - path: "podNamespace"
        fieldRef:
          fieldPath: metadata.namespace
      - path: "labels"
        fieldRef:
          fieldPath: metadata.labels
      - path: "annotations"
        fieldRef:
          fieldPath: metadata.annotations
      - path: "containerCpuRequestMilliCores"
        resourceFieldRef:
          containerName: main
          resource: requests.cpu
          divisor: 1m
      - path: "containerMemoryLimitBytes"
        resourceFieldRef:
          containerName: main
          resource: limits.memory
          divisor: 1
```

Instead of passing the metadata through environment variables, you’re defining a volume called downward and mounting it in your container under `/etc/downward`. The files this volume will contain are configured under the `downwardAPI.items` attribute in the volume specification.

Each item specifies the path (the filename) where the metadata should be written to and references either a pod-level field or a container resource field whose value you want stored in the file.

Let's create the pod and see it in action:

```bash
❯ kubectl apply -f k8s/pod/downward_api_by_volume.yaml

❯ kubectl exec downward -- ls -lah /etc/downward
total 4K
drwxrwxrwt    3 root     root         200 Aug  4 11:45 .
drwxr-xr-x    1 root     root        4.0K Aug  4 11:45 ..
drwxr-xr-x    2 root     root         160 Aug  4 11:45 ..2020_08_04_11_45_27.756107222
lrwxrwxrwx    1 root     root          31 Aug  4 11:45 ..data -> ..2020_08_04_11_45_27.756107222
lrwxrwxrwx    1 root     root          18 Aug  4 11:45 annotations -> ..data/annotations
lrwxrwxrwx    1 root     root          36 Aug  4 11:45 containerCpuRequestMilliCores -> ..data/containerCpuRequestMilliCores
lrwxrwxrwx    1 root     root          32 Aug  4 11:45 containerMemoryLimitBytes -> ..data/containerMemoryLimitBytes
lrwxrwxrwx    1 root     root          13 Aug  4 11:45 labels -> ..data/labels
lrwxrwxrwx    1 root     root          14 Aug  4 11:45 podName -> ..data/podName
lrwxrwxrwx    1 root     root          19 Aug  4 11:45 podNamespace -> ..data/podNamespace
```

:star: As with the configMap and secret volumes, you can change the file permissions through the downwardAPI volume’s defaultMode property in the pod spec.

Each file corresponds to an item in the volume’s definition. The contents of files, which correspond to the same metadata fields are the same as the values of environment variables.

```bash
❯ kubectl exec downward cat /etc/downward/labels
foo="bar"

❯ kubectl exec downward cat /etc/downward/annotations
key1="value1"
key2="multi\nline\nvalue\n"
kubectl.kubernetes.io/last-applied-configuration="{\"apiVersion\":\"v1\",\"kind\":\"Pod\",\"metadata\":{\"annotations\":{\"key1\":\"value1\",\"key2\":\"multi\\nline\\nvalue\\n\"},\"labels\":{\"foo\":\"bar\"},\"name\":\"downward\",\"namespace\":\"default\"},\"spec\":{\"containers\":[{\"command\":[\"sleep\",\"9999999\"],\"image\":\"busybox\",\"name\":\"main\",\"resources\":{\"limits\":{\"cpu\":\"100m\",\"memory\":\"4Mi\"},\"requests\":{\"cpu\":\"15m\",\"memory\":\"100Ki\"}},\"volumeMounts\":[{\"mountPath\":\"/etc/downward\",\"name\":\"downward\"}]}],\"volumes\":[{\"downwardAPI\":{\"items\":[{\"fieldRef\":{\"fieldPath\":\"metadata.name\"},\"path\":\"podName\"},{\"fieldRef\":{\"fieldPath\":\"metadata.namespace\"},\"path\":\"podNamespace\"},{\"fieldRef\":{\"fieldPath\":\"metadata.labels\"},\"path\":\"labels\"},{\"fieldRef\":{\"fieldPath\":\"metadata.annotations\"},\"path\":\"annotations\"},{\"path\":\"containerCpuRequestMilliCores\",\"resourceFieldRef\":{\"containerName\":\"main\",\"divisor\":\"1m\",\"resource\":\"requests.cpu\"}},{\"path\":\"containerMemoryLimitBytes\",\"resourceFieldRef\":{\"containerName\":\"main\",\"divisor\":1,\"resource\":\"limits.memory\"}}]},\"name\":\"downward\"}]}}\n"
kubernetes.io/config.seen="2020-08-04T11:45:27.477785202Z"
kubernetes.io/config.source="api"
```

Labels and annotations can be modified while a pod is running. As you might expect, when they change, Kubernetes updates the files holding them, allowing the pod to always see up-to-date data. This also explains why labels and annotations can’t be exposed through environment variables. Because environment variable values can’t be updated afterward, if the labels or annotations of a pod were exposed through environment variables, there’s no way to expose the new values after they’re modified.

:star: When exposing container-level metadata, such as a container’s resource limit or requests (done using resourceFieldRef), you need to specify the name of the container whose resource field you’re referencing.

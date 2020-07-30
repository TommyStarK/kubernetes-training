# kubernetes-training

## `DaemonSet`

Both ReplicationControllers and ReplicaSets are used for running a specific number of pods deployed anywhere in the Kubernetes cluster. But certain cases exist when you want a pod to run on each and every node in the cluster.

Those cases include infrastructure-related pods that perform system-level operations.

A DaemonSet makes sure it creates as many pods as there are nodes and deploys each one on its own node.

Whereas a ReplicaSet (or ReplicationController) makes sure that a desired number of pod replicas exist in the cluster, a DaemonSet doesn’t have any notion of a desired replica count. It doesn’t need it because its job is to ensure that a pod matching its pod selector is running on each node.

### demo

First of all, we should still have a node with the random=true label from a previous demo.

```bash
❯ kubectl get nodes -L random
NAME                                          STATUS   ROLES    AGE   VERSION          RANDOM
gke-k8s-training-default-pool-3088a1f5-1fz4   Ready    <none>   28h   v1.15.12-gke.2   true
gke-k8s-training-default-pool-3088a1f5-rd72   Ready    <none>   28h   v1.15.12-gke.2
```

> If not, just add the `random=true` label to one of your nodes.

#### 1. **Create the Daemonset**

```bash
❯ kubectl apply -f k8s/daemonset/dummy_node_app.yaml
```

Now if we ask for the running pods, we can see that there is single pod running, this pod is labeled `app=dummy` and it's running on
the node labeled `random=true`

```bash
❯ kubectl get pods -o wide --show-labels
NAME                              READY   STATUS    RESTARTS   AGE   IP          NODE                                          NOMINATED NODE   READINESS GATES   LABELS
daemon-set-dummy-node-app-w5dlk   1/1     Running   0          18s   10.4.1.33   gke-k8s-training-default-pool-3088a1f5-1fz4   <none>           <none>            app=dummy,controller-revision-hash=7bd989d77d,pod-template-generation=1
```

Feel free to get the DaemonSet or describe it to have more insight.

```bash
❯ kubectl get daemonsets daemon-set-dummy-node-app
NAME                        DESIRED   CURRENT   READY   UP-TO-DATE   AVAILABLE   NODE SELECTOR   AGE
daemon-set-dummy-node-app   1         1         1       1            1           random=true     4m29s
```

```bash
❯ kubectl describe daemonsets daemon-set-dummy-node-app
Name:           daemon-set-dummy-node-app
Selector:       app=dummy
Node-Selector:  random=true
Labels:         <none>
Annotations:    deprecated.daemonset.template.generation: 1
                kubectl.kubernetes.io/last-applied-configuration:
                  {"apiVersion":"apps/v1","kind":"DaemonSet","metadata":{"annotations":{},"name":"daemon-set-dummy-node-app","namespace":"chapter2"},"spec":...
Desired Number of Nodes Scheduled: 1
Current Number of Nodes Scheduled: 1
Number of Nodes Scheduled with Up-to-date Pods: 1
Number of Nodes Scheduled with Available Pods: 1
Number of Nodes Misscheduled: 0
Pods Status:  1 Running / 0 Waiting / 0 Succeeded / 0 Failed
Pod Template:
  Labels:  app=dummy
  Containers:
   dummy-node-app:
    Image:        tommystark/dummy-node-app
    Port:         8080/TCP
    Host Port:    0/TCP
    Environment:  <none>
    Mounts:       <none>
  Volumes:        <none>
Events:
  Type    Reason            Age    From                  Message
  ----    ------            ----   ----                  -------
  Normal  SuccessfulCreate  5m43s  daemonset-controller  Created pod: daemon-set-dummy-node-app-w5dlk
```

#### 2. **Remove Node's label when there is a pod already running and managed by a DaemonSet**

```bash
❯ kubectl label nodes gke-k8s-training-default-pool-3088a1f5-1fz4 random-
```

The pod is being terminated.

```bash
❯ kubectl get pods -o wide --show-labels
NAME                              READY   STATUS        RESTARTS   AGE    IP          NODE                                          NOMINATED NODE   READINESS GATES   LABELS
daemon-set-dummy-node-app-w5dlk   1/1     Terminating   0          9m1s   10.4.1.33   gke-k8s-training-default-pool-3088a1f5-1fz4   <none>           <none>            app=dummy,controller-revision-hash=7bd989d77d,pod-template-generation=1
```

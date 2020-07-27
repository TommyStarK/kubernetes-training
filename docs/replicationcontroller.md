# kubernetes-training

## `ReplicationController`

ReplicationController enables the following powerful features:

- It makes sure a pod (or multiple pod replicas) is always running by starting a new pod when an existing one goes missing.

- When a cluster node fails, it creates replacement replicas for all the pods that were running on the failed node (those that were under the Replication- Controller’s control).

- It enables easy horizontal scaling of pods—both manual and automatic.

A ReplicationController has three essential parts:

- label selector, which determines what pods are in the ReplicationController’s scope

- replica count, which specifies the desired number of pods that should be running

- pod template, which is used when creating new pod replicas

**NOTE:** A pod instance is never relocated to another node. Instead, the ReplicationController creates a completely new pod instance that has no relation to the instance it’s replacing.

### demo

- Create a ReplicationController for the dummy node app

```bash
❯ kubectl apply -f k8s/replicationcontroller/dummy_node_app.yaml
```

- Check running pods

```bash
❯ kubectl get pods
NAME                                          READY   STATUS    RESTARTS   AGE
replication-controller-dummy-node-app-4lzbc   1/1     Running   0          1m
replication-controller-dummy-node-app-7hj7t   1/1     Running   0          1m
replication-controller-dummy-node-app-bcw8v   1/1     Running   0          1m
```

If you delete one pod, the ReplicationController will automatically create a new one.
ReplicationControllers always keep the desired number of pod replicas running.

- Move pod out of ReplicationController's scope

Pods created by a ReplicationController aren’t tied to the ReplicationController in any way. At any moment, a ReplicationController manages pods that match its label selector.

By changing a pod’s labels, it can be removed from or added to the scope of a ReplicationController. It can even be moved from one ReplicationController to another.

```bash
❯ kubectl label pods replication-controller-dummy-node-app-bcw8v app=foo --overwrite
```

Now pod's labels don't match ReplicationController's scope and then a new pod will be created to always match the desired state and the desired replicas number.

```bash
❯ kubectl get pods --show-labels
NAME                                          READY   STATUS    RESTARTS   AGE   LABELS
replication-controller-dummy-node-app-4lzbc   1/1     Running   0          20m   app=dummy
replication-controller-dummy-node-app-6kmt2   1/1     Running   0          15m   app=dummy
replication-controller-dummy-node-app-7hj7t   1/1     Running   0          20m   app=dummy
replication-controller-dummy-node-app-bcw8v   1/1     Running   0          20m   app=foo
```

:star: Removing a pod from the scope of the ReplicationController comes in handy when you want to perform actions on a specific pod. For example, you might have a bug that causes your pod to start behaving badly after a specific amount of time or a specific event. If you know a pod is malfunctioning, you can take it out of the ReplicationController’s scope, let the controller replace it with a new one, and then debug or play with the pod in any way you want. Once you’re done, you delete the pod.

- Delete managed pods when deleting a ReplicationController

```bash
❯ kubectl delete replicationcontrollers replication-controller-dummy-node-app --cascade=true
```

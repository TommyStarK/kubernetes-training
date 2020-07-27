# kubernetes-training

## `ReplicaSet`

A ReplicaSet behaves exactly like a ReplicationController, but it has more expressive pod selectors. Whereas a ReplicationController’s label selector only allows matching pods that include a certain label, a ReplicaSet’s selector also allows matching pods that lack a certain label or pods that include a certain label key, regardless of its value.


The main improvements of ReplicaSets over ReplicationControllers are their more expressive label selectors.
You can add additional expressions to the selector:
- `In`—Label’s value must match one of the specified values.
- `NotIn`—Label’s value must not match any of the specified values.
- `Exists`—Pod must include a label with the specified key (the value isn’t import-
ant). When using this operator, you shouldn’t specify the values field.
- `DoesNotExist`—Pod must not include a label with the specified key. The values
property must not be specified.

If you specify multiple expressions, all those expressions must evaluate to true for the selector to match a pod. If you specify both matchLabels and matchExpressions, all the labels must match and all the expressions must evaluate to true for the pod to match the selector.

## example

- Create a ReplicaSet for the dummy-node-app

```bash
❯ kubectl apply -f k8s/replicaset/dummy_node_app.yaml
```

- Display pods

```bash
❯ kubectl get pods --show-labels
NAME                               READY   STATUS    RESTARTS   AGE   LABELS
replica-set-dummy-node-app-6q6pl   1/1     Running   0          17s   app=dummy
replica-set-dummy-node-app-n8bv7   1/1     Running   0          17s   app=dummy
replica-set-dummy-node-app-p2bkc   1/1     Running   0          17s   app=dummy
```

If you take a look at the yaml files, we can see that the ReplicaSet manages pods that have the label `app` with a value of either `dummy` or `rs-dummy`.

Let's take a random pod and update its `app` label to equal `rs-dummy`:

```bash
❯ kubectl label pods replica-set-dummy-node-app-p2bkc app=rs-dummy --overwrite
```

If we check again, nothing happened, there are still 3 pods running:

```bash
❯ kubectl get pods --show-labels
NAME                               READY   STATUS    RESTARTS   AGE     LABELS
replica-set-dummy-node-app-6q6pl   1/1     Running   0          4m28s   app=dummy
replica-set-dummy-node-app-n8bv7   1/1     Running   0          4m28s   app=dummy
replica-set-dummy-node-app-p2bkc   1/1     Running   0          4m28s   app=rs-dummy
```

Now let's update another pod's label to set it to `foo`:

```bash
❯ kubectl label pods replica-set-dummy-node-app-n8bv7 app=foo --overwrite
```

and then check one last time our pods to see that a new pod has been created to satisfy the desired stated defined by this ReplicaSet.

```bash
❯ kubectl get pods --show-labels
NAME                               READY   STATUS              RESTARTS   AGE     LABELS
replica-set-dummy-node-app-6q6pl   1/1     Running             0          5m37s   app=dummy
replica-set-dummy-node-app-hsb4s   0/1     ContainerCreating   0          2s      app=dummy
replica-set-dummy-node-app-n8bv7   1/1     Running             0          5m37s   app=foo
replica-set-dummy-node-app-p2bkc   1/1     Running             0          5m37s   app=rs-dummy
```

# kubernetes-training

## `Deployment`

A `Deployment` is a higher-level resource meant for deploying applications and updating them declaratively, instead of doing it through a `ReplicationController` or a `ReplicaSet`, which are both considered lower-level concepts.

You describe a desired state in a `Deployment`, and the Deployment Controller changes the actual state to the desired state at a controlled rate. You can define `Deployments` to create new `ReplicaSets`, or to remove existing Deployments and adopt all their resources with new Deployments.

The following are typical use cases for Deployments:

- Create a Deployment to rollout a ReplicaSet. The ReplicaSet creates Pods in the background. Check the status of the rollout to see if it succeeds or not.
- Declare the new state of the Pods by updating the PodTemplateSpec of the Deployment. A new ReplicaSet is created and the Deployment manages moving the Pods from the old ReplicaSet to the new one at a controlled rate. Each new ReplicaSet updates the revision of the Deployment.
- Rollback to an earlier Deployment revision if the current state of the Deployment is not stable. Each rollback updates the revision of the Deployment.
- Scale up the Deployment to facilitate more load.
- Pause the Deployment to apply multiple fixes to its PodTemplateSpec and then resume it to start a new rollout.
- Use the status of the Deployment as an indicator that a rollout has stuck.
- Clean up older ReplicaSets that you don't need anymore.

### demo

#### 1. **Creating a `Deployment`**

The following is an example of a `Deployment`. It creates a `ReplicaSet` to bring up three 'dummy-node-app' Pods:

```yaml
apiVersion: apps/v1beta1
kind: Deployment
metadata:
  name: dummy-node-app-deployment
spec:
  replicas: 3
  selector:
    matchLabels:
      app: dummy
  template:
    metadata:
      labels:
        app: dummy
    spec:
      containers:
      - name: dummy-node-app
        image: tommystark/dummy-node-app
```

Create the `Deployment`:

```bash
❯ kubectl apply -f k8s/deployment/dummy_node_app.yaml --record
deployment.apps/dummy-node-app-deployment created
```

:star: Be sure to include the --record command-line option when creating it. This records the command in the revision history.

Run `kubectl get deployments` to check if the Deployment was created.
If the Deployment is still being created, the output is similar to the following:

```bash
❯ kubectl get deployments
NAME                        READY   UP-TO-DATE   AVAILABLE   AGE
dummy-node-app-deployment   2/3     3            2           106s
```

When you inspect the Deployments in your cluster, the following fields are displayed:

- `NAME` lists the names of the Deployments in the namespace.
- `READY` displays how many replicas of the application are available to your users. It follows the pattern ready/desired.
- `UP-TO-DATE` displays the number of replicas that have been updated to achieve the desired state.
- `AVAILABLE` displays how many replicas of the application are available to your users.
- `AGE` displays the amount of time that the application has been running.

**Displaying the status of the deployment rollout:**

```bash
❯ kubectl rollout status deployment dummy-node-app-deployment
deployment "dummy-node-app-deployment" successfully rolled out
```

According to this, the `Deployment` has been successfully rolled out, so you should see the three pod replicas up and running.

```bash
❯ kubectl get pods --show-labels
NAME                                         READY   STATUS    RESTARTS   AGE   LABELS
dummy-node-app-deployment-7bb5b9db57-4vj8z   1/1     Running   0          20m   app=dummy,pod-template-hash=7bb5b9db57
dummy-node-app-deployment-7bb5b9db57-gr52p   1/1     Running   0          20m   app=dummy,pod-template-hash=7bb5b9db57
dummy-node-app-deployment-7bb5b9db57-zml8d   1/1     Running   0          20m   app=dummy,pod-template-hash=7bb5b9db57
```

To see the `ReplicaSet` created by the `Deployment`, run:

```bash
❯ kubectl get replicasets
NAME                                   DESIRED   CURRENT   READY   AGE
dummy-node-app-deployment-7bb5b9db57   3         3         3       20m
```

Now we can create a `Service` to access those pods:

```bash
❯ kubectl apply -f k8s/service/dummy_node_app_load_balancer.yaml
service/load-balancer-dummy-node-app created

❯ kubectl get services
NAME                           TYPE           CLUSTER-IP   EXTERNAL-IP     PORT(S)        AGE
kubernetes                     ClusterIP      10.0.0.1     <none>          443/TCP        8d
load-balancer-dummy-node-app   LoadBalancer   10.0.5.25    34.77.254.254   80:30129/TCP   4m18s

# and then use cURL
❯ curl http://34.77.254.254
You have reached dummy-node-app-deployment-7bb5b9db57-4vj8z
❯ curl http://34.77.254.254
You have reached dummy-node-app-deployment-7bb5b9db57-gr52p
❯ curl http://34.77.254.254
You have reached dummy-node-app-deployment-7bb5b9db57-zml8d
```

#### 2. **Updating a `Deployment`**

The only thing you need to do is modify the pod template defined in the `Deployment` resource and Kubernetes will take all the steps necessary to get the actual system state to what’s defined in the resource. Similar to scaling a `ReplicationController` or `ReplicaSet` up or down, all you need to do is reference a new image tag in the Deployment’s pod template and leave it to Kubernetes to transform your system so it matches the new desired state.

**Understanding the available `Deployment` strategies**
- The `Recreate` strategy causes all old pods to be deleted before the new ones are created. Use this strategy when your application doesn’t support running multiple versions in parallel and requires the old version to be stopped completely before the new one is started. This strategy does involve a short period of time when your app becomes completely unavailable.
- The `RollingUpdate` strategy, on the other hand, removes old pods one by one, while adding new ones at the same time, keeping the application available throughout the whole process, and ensuring there’s no drop in its capacity to handle requests. This is the default strategy. The upper and lower limits for the number of pods above or below the desired replica count are configurable. You should use this strategy only when your app can handle running both the old and new version at the same time.

**Triggering the rolling update**

If you’d like to track the update process as it progresses, first run the following command in another terminal to see what’s happening with the requests:

```bash
❯ while true; do sleep 2 && curl http://34.77.254.254; done
You have reached dummy-node-app-deployment-7bb5b9db57-gr52p
You have reached dummy-node-app-deployment-7bb5b9db57-gr52p
You have reached dummy-node-app-deployment-7bb5b9db57-zml8d
You have reached dummy-node-app-deployment-7bb5b9db57-gr52p
You have reached dummy-node-app-deployment-7bb5b9db57-zml8d
You have reached dummy-node-app-deployment-7bb5b9db57-zml8d
You have reached dummy-node-app-deployment-7bb5b9db57-4vj8z
```

To trigger the actual rollout, you’ll change the image used in the single pod container to tommystark/dummy-node-app:v2

```bash
❯ kubectl set image deployment dummy-node-app-deployment dummy-node-app=tommystark/dummy-node-app:v2
deployment.extensions/dummy-node-app-deployment image updated
```

If you’ve run the curl loop, you’ll see requests initially hitting only the v1 pods; then more and more of them hit the v2 pods until, finally, all of them hit only the remaining v2 pods, after all v1 pods are deleted.

By changing the pod template in your `Deployment` resource, you’ve updated your app to a newer version, by changing a single field!
The controllers running as part of the Kubernetes control plane then performed the update.

You can still see the old `ReplicaSet` next to the new one if you list them:

```bash
❯ kubectl get replicasets
NAME                                   DESIRED   CURRENT   READY   AGE
dummy-node-app-deployment-798694668c   3         3         3       7m22s
dummy-node-app-deployment-7bb5b9db57   0         0         0       59m
```

:warning: Be aware that if the pod template in the Deployment references a `ConfigMap` (or a `Secret`), modifying the `ConfigMap` will not trigger an update. One way to trigger an update when you need to modify an app’s config is to create a new `ConfigMap` and modify the pod template so it references the new `ConfigMap`.

#### 3. **Rolling back a `Deployment`**

You’re currently running version v2 of your image. In version 3, you’ll introduce a bug that makes your app handle only the first four requests properly. All requests from the fifth request onward will return an internal server error (HTTP status code 500).

We'll use the `kubectl patch` command to specify a new image to the pod container spec as well as a specific command and arguments to trigger the bug. Check the [app.js](https://github.com/TommyStarK/kubernetes-training/blob/master/apps/dummy-node-app/v3/app.js) file.

```bash
❯ kubectl patch deployment dummy-node-app-deployment -p '{"spec": {"template": {"spec": {"containers": [{"name": "dummy-node-app", "image": "tommystark/dummy-node-app:v3", "command": ["node"], "args": ["app.js", "shouldFail"]}]}}}}'
deployment.extensions/dummy-node-app-deployment patched
```

Still in a different terminal you can run the cURL loop to see the bug:

```bash
❯ while true; do sleep 2 && curl http://34.77.254.254; done
dummy-node-app-v2: You have reached dummy-node-app-deployment-798694668c-tnz5m
dummy-node-app-v3: You have reached dummy-node-app-deployment-b54d97fff-drl5t
dummy-node-app-v2: You have reached dummy-node-app-deployment-798694668c-tnz5m
dummy-node-app-v3: You have reached dummy-node-app-deployment-b54d97fff-drl5t
dummy-node-app-v3: You have reached dummy-node-app-deployment-b54d97fff-drl5t
dummy-node-app-v2: You have reached dummy-node-app-deployment-798694668c-tnz5m
dummy-node-app-v3: You have reached dummy-node-app-deployment-b54d97fff-gh72z
dummy-node-app-v2: You have reached dummy-node-app-deployment-798694668c-tnz5m
dummy-node-app-v3: You have reached dummy-node-app-deployment-b54d97fff-drl5t
Some internal error has occurred! This is pod dummy-node-app-deployment-b54d97fff-drl5t
dummy-node-app-v3: You have reached dummy-node-app-deployment-b54d97fff-gh72z
dummy-node-app-v3: You have reached dummy-node-app-deployment-b54d97fff-gh72z
Some internal error has occurred! This is pod dummy-node-app-deployment-b54d97fff-drl5t
Some internal error has occurred! This is pod dummy-node-app-deployment-b54d97fff-drl5t
```

**Undoing a rollout:**

You can’t have your users experiencing internal server errors, so you need to do something about it fast. Luckily, Deployments make it easy to roll back to the previously deployed version by telling Kubernetes to undo the last rollout of a Deployment:

```bash
❯ kubectl rollout undo deployment dummy-node-app-deployment
deployment.extensions/dummy-node-app-deployment rolled back
```
This rolls the Deployment back to the previous revision.

:star: The undo command can also be used while the rollout process is still in progress to essentially abort the rollout. Pods already created during the rollout process are removed and replaced with the old ones again.

#### 4. **`Deployment`'s rollout history**

Rolling back a rollout is possible because Deployments keep a revision history. The history is stored in the underlying ReplicaSets. When a rollout completes, the old ReplicaSet isn’t deleted, and this enables rolling back to any revision, not only the previous one. The revision history can be displayed with the kubectl rollout history command:

```bash
❯ kubectl rollout history deployment dummy-node-app-deployment
deployment.extensions/dummy-node-app-deployment
REVISION  CHANGE-CAUSE
1         kubectl apply --filename=k8s/deployment/dummy_node_app.yaml --record=true
2         kubectl apply --filename=k8s/deployment/dummy_node_app.yaml --record=true
3         kubectl apply --filename=k8s/deployment/dummy_node_app.yaml --record=true
```

To see the details of each revision, run:

```bash
❯ kubectl rollout history deployment dummy-node-app-deployment --revision 1
deployment.extensions/dummy-node-app-deployment with revision #1
Pod Template:
  Labels:	app=dummy
	pod-template-hash=7bb5b9db57
  Annotations:	kubernetes.io/change-cause: kubectl apply --filename=k8s/deployment/dummy_node_app.yaml --record=true
  Containers:
   dummy-node-app:
    Image:	tommystark/dummy-node-app
    Port:	<none>
    Host Port:	<none>
    Environment:	<none>
    Mounts:	<none>
  Volumes:	<none>
```

You can roll back to a specific revision by specifying the revision in the undo command. For example, if you want to roll back to the first version, you’d execute the following command:

```bash
❯ kubectl rollout undo deployment dummy-node-app-deployment --to-revision 1
deployment.extensions/dummy-node-app-deployment rolled back
```

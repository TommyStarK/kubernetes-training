
# kubernetes-training

## `Job`

You’ll have cases where you only want to run a task that terminates after completing its work. ReplicationControllers, ReplicaSets, and DaemonSets run continuous tasks that are never considered completed. Processes in such pods are restarted when they exit. But in a completable task, after its process terminates, it should not be restarted again.

Kubernetes includes support for this through the Job resource, it allows you to run a pod whose container isn’t restarted when the process running inside finishes successfully. Once it does, the pod is considered complete.

When a Job completes, no more Pods are created, but the Pods are not deleted either. Keeping them around allows you to still view the logs of completed pods to check for errors, warnings, or other diagnostic output. The job object also remains after it is completed so that you can view its status. It is up to the user to delete old jobs after noting their status.

### demo

#### 1. **Simple job**

```bash
❯ kubectl apply -f k8s/job/pi.yaml
```

We can see that one pod is running:

```bash
❯ kubectl get pods
NAME                    READY   STATUS    RESTARTS   AGE
pi-with-timeout-d75qq   1/1     Running   0          5s

# and check the logs of the pod
❯ kk logs pi-with-timeout-d75qq
# you should see something like the following
3.1415926535897932384626433832795028841971...
```

If we take a look at the Job:

```bash
❯ kubectl get jobs
NAME              COMPLETIONS   DURATION   AGE
pi-with-timeout   1/1           12s        97s
```

#### 2. **Multi completion Job**

```bash
❯ kubectl apply -f k8s/job/pi_multi_completion.yaml

# Wait a few and then we can see that 3 more pods just completed
❯ kubectl get pods
NAME                        READY   STATUS      RESTARTS   AGE
multi-completion-pi-748b8   0/1     Completed   0          20s
multi-completion-pi-7rvz2   0/1     Completed   0          12s
multi-completion-pi-s2nbn   0/1     Completed   0          32s
pi-with-timeout-d75qq       0/1     Completed   0          9m34s
```

#### 3. **Running Jobs in parallel**

```bash
❯ kubectl apply -f k8s/job/pi_parallelism.yaml

# check there are 2 pods running in parrallel
❯ kubectl get pods
NAME                   READY   STATUS    RESTARTS   AGE
parallelism-pi-vhpck   1/1     Running   0          9s
parallelism-pi-vrkzf   1/1     Running   0          9s

# after a few seconds we can see that all pods are completed
❯ kubectl get pods
NAME                   READY   STATUS      RESTARTS   AGE
parallelism-pi-5b6wm   0/1     Completed   0          52s
parallelism-pi-7hbjh   0/1     Completed   0          32s
parallelism-pi-gzrc5   0/1     Completed   0          32s
parallelism-pi-qkwdm   0/1     Completed   0          52s
parallelism-pi-vhpck   0/1     Completed   0          72s
parallelism-pi-vrkzf   0/1     Completed   0          72s
```


# kubernetes-training

## `CronJob`

A CronJob creates Jobs on a repeating schedule.

One CronJob object is like one line of a crontab (cron table) file. It runs a job periodically on a given schedule, written in Cron format.

### demo

#### **Create the CronJob**

```bash
❯ kubectl apply -f k8s/cronjob/hello.yaml

# 
❯ kubectl get cronjobs
NAME    SCHEDULE      SUSPEND   ACTIVE   LAST SCHEDULE   AGE
hello   */1 * * * *   False     0        26s             85s

# 
❯ kubectl get pods
NAME                     READY   STATUS      RESTARTS   AGE
hello-1595876160-82blk   0/1     Completed   0          27s

# 
❯ kubectl logs hello-1595876160-82blk
Mon Jul 27 18:56:06 UTC 2020
Hello from the Kubernetes cluster
```

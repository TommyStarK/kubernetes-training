# kubernetes-training

## `Volumes`

We’ve said that pods are similar to logical hosts where processes running inside them share resources such as CPU, RAM, network interfaces, and others. One would expect the processes to also share disks, but that’s not the case. You’ll remember that each container in a pod has its own isolated filesystem, because the filesystem comes from the container’s image.

Every new container starts off with the exact set of files that was added to the image at build time. Combine this with the fact that containers in a pod get restarted (either because the process died or because the liveness probe signaled to Kubernetes that the container wasn’t healthy anymore) and you’ll realize that the new container will not see anything that was written to the filesystem by the previous container, even though the newly started container runs in the same pod.

Kubernetes provides this by defining storage volumes. They aren’t top-level resources like pods, but are instead defined as a part of a pod and share the same lifecycle as the pod. This means a volume is created when the pod is started and is destroyed when the pod is deleted. Because of this, a volume’s contents will persist across container restarts.

After a container is restarted, the new container can see all the files that were written to the volume by the previous container. Also, if a pod contains multiple containers, the volume can be used by all of them at once.

Kubernetes volumes are a component of a pod and are thus defined in the pod’s specification much like containers. They aren’t a standalone Kubernetes object and cannot be created or deleted on their own. A volume is available to all containers in the pod, but it must be mounted in each container that needs to access it. In each con- tainer, you can mount the volume in any location of its filesystem.

A wide variety of volume types is available. Several are generic, while others are specific to the actual storage technologies used underneath:

- `emptyDir` A simple empty directory used for storing transient data.
- `hostPath` Used for mounting directories from the worker node’s filesystem
into the pod.
- `gitRepo` A volume initialized by checking out the contents of a Git repository.
- `nfs` An NFS share mounted into the pod.
- `gcePersistentDisk` (Google Compute Engine Persistent Disk), `awsElastic-BlockStore` (Amazon Web Services Elastic Block Store Volume), `azureDisk` (Microsoft Azure Disk Volume) Used for mounting cloud provider-specific storage.
- `cinder`, `cephfs`, `iscsi`, `flocker`, `glusterfs`, `quobyte`, `rbd`, `flexVolume`, `vsphere-Volume`, `photonPersistentDisk`, `scaleIO` Used for mounting other types of network storage.
- `configMap`, `secret`, `downwardAPI` Special types of volumes used to expose certain Kubernetes resources and cluster information to the pod.
- `persistentVolumeClaim`A way to use a pre- or dynamically provisioned persistent storage.

### demo

#### 1. **Using an emptyDir volume**

Take a look at the following [pod](https://github.com/TommyStarK/kubernetes-training/blob/master/k8s/volumes/pod/fortune_empty_dir_volume.yaml) file.

The pod contains two containers and a single volume that’s mounted in both of them, yet at different paths.

When the `fortune-app` container starts, it starts writing the output of the fortune command to the `/var/htdocs/index.html` file every 10 seconds. Because the volume is mounted at `/var/htdocs`, the index.html file is written to the volume instead of the container’s top layer.

As soon as the `web-server` container starts, it starts serving whatever HTML files are in the `/usr/share/nginx/html` directory (this is the default directory Nginx serves files from). 

Because you mounted the volume in that exact location, Nginx will serve the index.html file written there by the container running the fortune loop. The end effect is that a client sending an HTTP request to the pod on port 80 will receive the current fortune message as the response.

```bash
# let's create our pod
❯ kubectl apply -f k8s/volumes/pod/fortune_empty_dir_volume.yaml

# then a LoadBalancer service to expose it
❯ kubectl apply -f k8s/volumes/service/fortune.yaml

# wait a few seconds to get the external IP
❯ kubectl get services
NAME              TYPE           CLUSTER-IP    EXTERNAL-IP    PORT(S)        AGE
service-fortune   LoadBalancer   10.0.12.159   35.187.92.75   80:31276/TCP   9m50s

# and theen
❯ curl  http://35.187.92.75
Man is the only animal that blushes -- or needs to.
		-- Mark Twain

❯ curl  http://35.187.92.75
Many changes of mind and mood; do not hesitate too long.
```

:warning: The `emptyDir` you used as the volume was created on the actual disk of the worker node hosting your pod, so its performance depends on the type of the node’s disks.

But you can tell Kubernetes to create the emptyDir on a tmpfs filesystem:

```yaml
volumes:
  - name: foo
    emptyDir:
      medium: Memory
```

#### 2. **Using a Git repository as the starting point for a volume and sidecars containers to keep git repository in sync**

In our yaml file describing this [pod](https://github.com/TommyStarK/kubernetes-training/blob/master/k8s/volumes/pod/sidecar_containers_git_sync.yaml), we have defined two containers and on volume of type `gitRepo`. The first container is the git sync container, it will periodically fetch the git repository (https://github.com/TommyStarK/hello-world-website.git) to keep the content of the volume up to date with the git repository.

The second container is a web server based on Nginx which will serve the content of the volume.

```bash
# create the pod
❯ kubectl apply -f k8s/volumes/pod/sidecar_containers_git_sync.yaml

# once the pod is ready and running we can first take a look
# at the sidecar-git-sync container logs
❯ kubectl logs sidecar-containers-git-sync -c sidecar-git-sync
2020/07/30 11:07:26 fetch "master": From https://github.com/TommyStarK/hello-world-website
 * branch            master     -> FETCH_HEAD
2020/07/30 11:07:26 reset "FETCH_HEAD": HEAD is now at aaa6b68 initial commit
2020/07/30 11:07:26 wait 10 seconds
2020/07/30 11:07:36 done
2020/07/30 11:07:37 fetch "master": From https://github.com/TommyStarK/hello-world-website
 * branch            master     -> FETCH_HEAD
2020/07/30 11:07:37 reset "FETCH_HEAD": HEAD is now at aaa6b68 initial commit
2020/07/30 11:07:37 wait 10 seconds
2020/07/30 11:07:47 done

# Now the syncing part seems to be working so we are going to
# request our web server
# We use port-forward to simplify things
❯ kubectl port-forward sidecar-containers-git-sync 8080:80
Forwarding from 127.0.0.1:8080 -> 80
Forwarding from [::1]:8080 -> 80
Handling connection for 8080

# You can go to your web browser 
# to the following url http://localhost:8080
```

You can now delete the pod, create your own git repository hosted on github, edit the yaml file, deploy the pod again and request your own website. You can also update your website and request it again to see that it is up to date.

#### 3. **Accessing files on the worker node’s filesystem, the `hostPath` volume**

#### 4. **Using persistent storage**

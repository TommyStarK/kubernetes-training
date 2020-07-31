# kubernetes-training

## `PersistentVolumes`

Managing storage is a distinct problem from managing compute instances. The `PersistentVolume` subsystem provides an API for users and administrators that abstracts details of how storage is provided from how it is consumed.

A `PersistentVolume` (PV) is a piece of storage in the cluster that has been provisioned by an administrator or dynamically provisioned using Storage Classes. It is a resource in the cluster just like a node is a cluster resource. PVs are volume plugins like Volumes, but have a lifecycle independent of any individual Pod that uses the PV. This API object captures the details of the implementation of the storage, be that NFS, iSCSI, or a cloud-provider-specific storage system.

A `PersistentVolumeClaim` (PVC) is a request for storage by a user. It is similar to a Pod. Pods consume node resources and PVCs consume PV resources. Pods can request specific levels of resources (CPU and Memory). Claims can request specific size and access modes (e.g., they can be mounted ReadWriteOnce, ReadOnlyMany or ReadWriteMany, see AccessModes).

### demo

Let’s revisit the MongoDB example, but unlike before, you won’t reference the GCE Persistent Disk in the pod directly. Instead, you’ll first assume the role of a cluster administrator and create a `PersistentVolume` backed by the GCE Persistent Disk. Then you’ll assume the role of the application developer and first claim the `PersistentVolume` and then use it inside your pod.

When creating a `PersistentVolume`, the administrator needs to tell Kubernetes what its capacity is and whether it can be read from and/or written to by a single node or by multiple nodes at the same time. They also need to tell Kubernetes what to do with the `PersistentVolume` when it’s released (when the PersistentVolumeClaim it’s bound to is deleted). And last, but certainly not least, they need to specify the type, location, and other properties of the actual storage this `PersistentVolume` is backed by.

#### 1. **Creating a PersistentVolume**

```bash
# create the PersistentVolume
❯ kubectl apply -f k8s/volumes/persistentvolumes/gce_persistent_disk_mongodb.yaml

# As expected, the PersistentVolume is shown as Available,
# because you haven’t yet created the PersistentVolumeClaim.
❯ kubectl get persistentvolumes
NAME                             CAPACITY   ACCESS MODES   RECLAIM POLICY   STATUS      CLAIM   STORAGECLASS   REASON   AGE
gce-persistent-disk-mongodb-pv   1Gi        RWO,ROX        Retain           Available      
```

:warning: PersistentVolumes don’t belong to any namespace.
They’re cluster-level resources like nodes.

#### 2. **Claiming a PersistentVolume by creating a PersistentVolumeClaim**

You need to deploy a pod that requires persistent storage. You’ll use the `PersistentVolume` you created earlier. But you can’t use it directly in the pod. You need to claim it first.

Claiming a PersistentVolume is a completely separate process from creating a pod, because you want the same `PersistentVolumeClaim` to stay available even if the pod is rescheduled.

```bash
❯ kubectl apply -f k8s/volumes/persistentvolumeclaims/mongodb.yaml
```

As soon as you create the claim, Kubernetes finds the appropriate PersistentVolume and binds it to the claim. The `PersistentVolume’s` capacity must be large enough to accommodate what the claim requests. Additionally, the volume’s access modes must include the access modes requested by the claim.

The `PersistentVolume` you created earlier matches those two requirements so it is bound to your claim.

```bash
❯ kubectl get persistentvolumes
NAME                             CAPACITY   ACCESS MODES   RECLAIM POLICY   STATUS   CLAIM              STORAGECLASS   REASON   AGE
gce-persistent-disk-mongodb-pv   1Gi        RWO,ROX        Retain           Bound    default/mongodb-pvc                           13m

❯ kubectl get persistentvolumeclaims
NAME          STATUS   VOLUME                           CAPACITY   ACCESS MODES   STORAGECLASS   AGE
mongodb-pvc   Bound    gce-persistent-disk-mongodb-pv   1Gi        RWO,ROX                       18s
```

The `PersistentVolume` shows it’s bound to claim `default/mongodb-pvc.` The `default` part is the namespace the claim resides in (you created the claim in the default namespace).

`PersistentVolume` resources are cluster-scoped and thus cannot be created in a specific namespace, but `PersistentVolumeClaims` can only be created in a specific namespace. They can then only be used by pods in the same namespace.

**abbreviations used for the access modes:**

- `RWO—ReadWriteOnce` Only a single node can mount the volume for reading and writing.
- ``ROX—ReadOnlyMany`` Multiple nodes can mount the volume for reading.
- `RWX—ReadWriteMany` Multiple nodes can mount the volume for both reading
and writing.

:warning: RWO, ROX, and RWX pertain to the number of worker nodes that can use the volume at the same time, not to the number of pods!

#### 3. **Using a PersistentVolumeClaim in a pod**

The `PersistentVolume` is now yours to use. Nobody else can claim the same volume until you release it. To use it inside a pod, you need to reference the `PersistentVolumeClaim` by name inside the pod’s volume.

Create the pod:

```bash
❯ kubectl apply -f k8s/pod/mongodb_pvc.yaml
```

Check to see if the pod is indeed using the same `PersistentVolume` and its underlying GCE PersistentDisk. You should see the data you stored earlier by running the MongoDB shell again.

```bash
❯ kubectl exec -ti mongodb-pvc -c mongodb mongo

# check databases
> show dbs
admin    0.000GB
config   0.000GB
local    0.000GB
mystore  0.000GB

# switch to mystore
> use mystore
switched to db mystore

# check colleections
> show collections
foo

# find documents in the `foo` collection
> db.foo.find()
{ "_id" : ObjectId("5f22bbc71a0f84f250d9a4ea"), "name" : "foo" }
```

#### 4. **Recycling PersistentVolumes**

Delete the pod and the PersistentVolumeClaim:

```bash
❯ kubectl delete pods mongodb-pvc

❯ kubectl delete persistentvolumeclaims mongodb-pvc

# check the PersistentVolume
❯ kubectl get persistentvolumes
NAME                             CAPACITY   ACCESS MODES   RECLAIM POLICY   STATUS     CLAIM              STORAGECLASS   REASON   AGE
gce-persistent-disk-mongodb-pv   1Gi        RWO,ROX        Retain           Released   default/mongodb-pvc                           40m
```

The STATUS column shows the `PersistentVolume` as Released, not Available like before. Because you’ve already used the volume, it may contain data and shouldn’t be bound to a completely new claim without giving the cluster admin a chance to clean it up.

Without this, a new pod using the same `PersistentVolume` could read the data stored there by the previous pod, even if the claim and pod were created in a different namespace (and thus likely belong to a different cluster tenant).

- **Reclaiming PersistentVolumes manually**

The Retain reclaim policy allows for manual reclamation of the resource. When the `PersistentVolumeClaim` is deleted, the `PersistentVolume` still exists and the volume is considered "released". But it is not yet available for another claim because the previous claimant's data remains on the volume. An administrator can manually reclaim the volume with the following steps.

  1. Delete the `PersistentVolume`. The associated storage asset in external infrastructure (such as an AWS EBS, GCE PD, Azure Disk, or Cinder volume) still exists after the PV is deleted.
  2. Manually clean up the data on the associated storage asset accordingly.
  3. Manually delete the associated storage asset, or if you want to reuse the same storage asset, create a new `PersistentVolume` with the storage asset definition.

- **Reclaiming PersistentVolumes automatically**

  1. The Recycle reclaim policy deletes the volume’s contents and makes the volume available to be claimed again. This way, the PersistentVolume can be reused multiple times by different PersistentVolumeClaims and different pods.

  :warning: The Recycle reclaim policy is deprecated. Instead, the recommended approach is to use dynamic provisioning.

  2. The Delete policy, on the other hand, deletes the underlying storage.

:star: You can change the PersistentVolume reclaim policy on an existing PersistentVolume. For example, if it’s initially set to Delete, you can easily change it to Retain to prevent losing valuable data.

## Dynamic provisioning of `PersistentVolumes`

The cluster admin, instead of creating `PersistentVolumes`, can deploy a `PersistentVolume` provisioner and define one or more `StorageClass` objects to let users choose what type of `PersistentVolume` they want.

The users can refer to the `StorageClass` in their `PersistentVolumeClaims` and the provisioner will take that into account when provisioning the persistent storage.

Kubernetes includes provisioners for the most popular cloud providers, so the administrator doesn’t always need to deploy a provisioner. But if Kubernetes is deployed on-premises, a custom provisioner needs to be deployed.

Instead of the administrator pre-provisioning a bunch of `PersistentVolumes`, they need to define `StorageClasses` and let the system create a new `PersistentVolume` each time one is requested through a `PersistentVolumeClaim`. The great thing about this is that it’s impossible to run out of `PersistentVolumes` (obviously, you can run out of storage space).

Before a user can create a `PersistentVolumeClaim`, which will result in a new `PersistentVolume` being provisioned, an admin needs to create one or more `StorageClass` resources.

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: gce-persistent-disk
provisioner: kubernetes.io/gce-pd
parameters:
  type: pd-ssd
  zone: europe-west1-b
```

The StorageClass resource specifies which provisioner should be used for provisioning the `PersistentVolume` when a `PersistentVolumeClaim` requests this StorageClass.

The parameters defined in the `StorageClass` definition are passed to the provisioner and are specific to each provisioner plugin.

The `StorageClass` uses the Google Compute Engine (GCE) Persistent Disk (PD) provisioner, which means it can be used when Kubernetes is running in GCE. For other cloud providers, other provisioners need to be used.

**NOTE:** Similar to PersistentVolumes, StorageClass resources aren’t namespaced.

Create the StorageClass

```bash
❯ kubectl apply -f k8s/volumes/storageclass/gce_persistent_disk.yaml
```

Create a PersistentVolume definition requesting a specific StorageClass

```bash
❯ kubectl apply -f k8s/volumes/persistentvolumeclaims/mongodb_storage_class.yaml

# The VOLUME column shows the PersistentVolume that’s bound to this claim
❯ kubectl get persistentvolumeclaims
NAME          STATUS   VOLUME                                     CAPACITY   ACCESS MODES   STORAGECLASS          AGE
mongodb-pvc   Bound    pvc-0b46cbfb-2e31-4f5b-a2b1-697f1123a253   1Gi        RWO            gce-persistent-disk   3h38m

# You can try listing PersistentVolumes now to see that a new PV has indeed been created automatically
❯ kubectl get persistentvolumes
NAME                                       CAPACITY   ACCESS MODES   RECLAIM POLICY   STATUS     CLAIM              STORAGECLASS          REASON   AGE
gce-persistent-disk-mongodb-pv             1Gi        RWO,ROX        Retain           Released   default/mongodb-pvc                                  5h30m
pvc-0b46cbfb-2e31-4f5b-a2b1-697f1123a253   1Gi        RWO            Delete           Bound      default/mongodb-pvc   gce-persistent-disk            3h39m
```

The cluster admin can create multiple storage classes with different performance or other characteristics. The developer then decides which one is most appropriate for each claim they create.

The nice thing about `StorageClasses` is the fact that claims refer to them by name. The PVC definitions are therefore portable across different clusters, as long as the `StorageClass` names are the same across all of them.

- **without specifying a StorageClass**

The default storage class is what’s used to dynamically provision a `PersistentVolume` if the `PersistentVolumeClaim` doesn’t explicitly say which storage class to use.

Before going deeper, we need to do some cleaning:

```bash
# delete the storage class
❯ kubectl delete storageclasses gce-persistent-disk

# delete the pvc and thus delete the dynamically provisioned
# pv and persistent disk
❯ kubectl delete persistentvolumeclaims gce-persistent-disk

# delete the first pv we created
❯ kubectl delete persistentvolume gce-persistent-disk-mongodb-pv

# we should have something like this
❯ gcloud compute disks list
NAME                                         LOCATION        LOCATION_SCOPE  SIZE_GB  TYPE         STATUS
gke-k8s-training-default-pool-3088a1f5-1fz4  europe-west1-b  zone            100      pd-standard  READY
gke-k8s-training-default-pool-3088a1f5-rd72  europe-west1-b  zone            100      pd-standard  READY
mongodb
```

You’re going to use kubectl get to see more info about the standard storage class in a GKE cluster:

```bash
❯ kubectl get storageclasses
NAME                  PROVISIONER            AGE
gce-persistent-disk   kubernetes.io/gce-pd   4h38m
standard (default)    kubernetes.io/gce-pd   5d2h

❯ kubectl get storageclasses standard -o yaml
allowVolumeExpansion: true
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  annotations:
    # This annotation marks the storage class as default.
    storageclass.kubernetes.io/is-default-class: "true"
  creationTimestamp: "2020-07-26T13:14:28Z"
  labels:
    addonmanager.kubernetes.io/mode: EnsureExists
    kubernetes.io/cluster-service: "true"
  name: standard
  resourceVersion: "266"
  selfLink: /apis/storage.k8s.io/v1/storageclasses/standard
  uid: 5347f63c-a5d9-4d44-ad90-3815853ea8fb
parameters:
  # The type parameter is used by the provisioner to know what type of GCE PD to create.
  type: pd-standard
# The GCE Persistent Disk provisioner is used to provision PVs of this class.
provisioner: kubernetes.io/gce-pd
reclaimPolicy: Delete
volumeBindingMode: Immediate
```

You can create a PVC without specifying the `storageClassName` attribute and (on Google Kubernetes Engine) a GCE Persistent Disk of type pd-standard will be provisioned for you:

```bash
❯ kubectl apply -f k8s/volumes/persistentvolumeclaims/mongodb_without_storage_class.yaml

# the PVC is bound to a newly created volumee
❯ kubectl get persistentvolumeclaims
NAMESPACE   NAME                         STATUS   VOLUME                                     CAPACITY   ACCESS MODES   STORAGECLASS   AGE
default     mongodb-pvc-nostorageclass   Bound    pvc-5b6b2532-d1b1-4230-8509-dbad5a13493f   1Gi        RWO            standard       9s

# a new PV has been created of type pd-standard
❯ kubectl get persistentvolume
NAME                                       CAPACITY   ACCESS MODES   RECLAIM POLICY   STATUS   CLAIM                                STORAGECLASS   REASON   AGE
pvc-5b6b2532-d1b1-4230-8509-dbad5a13493f   1Gi        RWO            Delete           Bound    default/mongodb-pvc-nostorageclass   standard                10s

# we can see it here
❯ gcloud compute disks list
NAME                                                             LOCATION        LOCATION_SCOPE  SIZE_GB  TYPE         STATUS
gke-k8s-training-4dbad-pvc-5b6b2532-d1b1-4230-8509-dbad5a13493f  europe-west1-b  zone            1        pd-standard  READY
gke-k8s-training-default-pool-3088a1f5-1fz4                      europe-west1-b  zone            100      pd-standard  READY
gke-k8s-training-default-pool-3088a1f5-rd72                      europe-west1-b  zone            100      pd-standard  READY
mongodb
```

Specifying an empty string as the storage class name ensures the PVC binds to a pre-provisioned PV instead of dynamically provisioning a new one.

```yaml
kind: PersistentVolumeClaim
spec:
  storageClassName: ""
```

:star: Explicitly set `storageClassName` to "" if you want the PVC to use a pre-provisioned PersistentVolume.

To summarize, the best way to attach persistent storage to a pod is to only create the PVC (with an explicitly specified storage ClassName if necessary) and the pod (which refers to the PVC by name). Everything else is taken care of by the dynamic PersistentVolume provisioner.


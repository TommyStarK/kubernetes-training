
# kubernetes-training

## `ConfigMap`

A `ConfigMap` is an API object used to store non-confidential data in key-value pairs. Pods can consume `ConfigMaps` as environment variables, command-line arguments, or as configuration files in a volume.

A ConfigMap allows you to decouple environment-specific configuration from your container images, so that your applications are easily portable.

:warning: ConfigMap does not provide secrecy or encryption. If the data you want to store are confidential, use a Secret rather than a ConfigMap, or use additional (third party) tools to keep your data private.

Use a ConfigMap for setting configuration data separately from application code.

For example, imagine that you are developing an application that you can run on your own computer (for development) and in the cloud (to handle real traffic). You write the code to look in an environment variable named DATABASE_HOST. Locally, you set that variable to localhost. In the cloud, you set it to refer to a Kubernetes Service that exposes the database component to your cluster.

This lets you fetch a container image running in the cloud and debug the exact same code locally if needed.

You can write a Pod spec that refers to a ConfigMap and configures the container(s) in that Pod based on the data in the ConfigMap. The Pod and the ConfigMap must be in the same namespace.

### demo

#### 1. **Passing all entries of a ConfigMap as environment variables at once**

When your `ConfigMap` contains more than just a few entries, it becomes tedious and error-prone to create environment variables from each entry individually. Luckily, Kubernetes provides a way to expose all entries of a ConfigMap as environment variables.

Imagine having a ConfigMap with three keys called FOO, BAR, and FOO-BAR. You can expose them all as environment variables by using the envFrom attribute, instead of env.

```yaml
spec:
containers:
- image: some-image
  envFrom:
    - prefix: CONFIG_
      configMapRef:
        name: my-config-map
```

As you can see, you can also specify a prefix for the environment variables (CONFIG_ in this case). This results in the following two environment variables being present inside the container: CONFIG_FOO and CONFIG_BAR.

:star: The prefix is optional, so if you omit it the environment variables will have the same name as the keys.


The ConfigMap has three entries (FOO, BAR, and FOO-BAR)? Why is there no environment variable for the FOO-BAR ConfigMap entry?

The reason is that CONFIG_FOO-BAR isn’t a valid environment variable name because it contains a dash. Kubernetes doesn’t convert the keys in any way (it doesn’t convert dashes to underscores, for example). If a ConfigMap key isn’t in the proper format, it skips the entry (but it does record an event informing you it skipped it).

#### 2. **Passing a ConfigMap entry as a command-line argument**

Now, let’s also look at how to pass values from a `ConfigMap` as arguments to the main process running in the container. You can’t reference ConfigMap entries directly in the pod.spec.containers.args field, but you can first initialize an environment variable from the ConfigMap entry and then refer to the variable inside the argument.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-with-args-from-configmap
spec:
  containers:
  - image: some/image
    env:
    - name: INTERVAL
      valueFrom:
        configMapKeyRef:
          name: fortune-config
          key: sleep-interval
    args: ["$(INTERVAL)"]
```

#### 3. **Mouting individual ConfigMap entries as files without hiding other files in the directory**

For demo purposes we are going to use the `fortune-app` with a `ConfigMap` to customize the sleep interval between each call of the fortune command, and a specific Nginx configuration.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: fortune-config
data:
  nginx-gzip.conf: |
    server {
      listen 80;
      server_name www.app.fortune.com;

      gzip on;
      gzip_types text/plain application/xml;
      
      location / {
          root /usr/share/nginx/html; 
          index index.html index.htm;
      } 
    }
  sleep-interval: | 
    25
```

Create the `ConfigMap`

```bash
❯ kubectl apply -f k8s/configmap/fortune_config.yaml
```

Create the pod and forward port locally

```bash
❯ kubectl apply -f k8s/pod/fortune_config_map.yaml

❯ kubectl port-forward fortune 8080:80
Forwarding from 127.0.0.1:8080 -> 80
Forwarding from [::1]:8080 -> 80
```

In a different terminal

```bash
❯ curl -H "Accept-Encoding: gzip" -I localhost:8080
HTTP/1.1 200 OK
Server: nginx/1.19.1
Date: Sun, 02 Aug 2020 17:01:10 GMT
Content-Type: text/html
Last-Modified: Sun, 02 Aug 2020 17:00:53 GMT
Connection: keep-alive
ETag: W/"5f26f145-58"
Content-Encoding: gzip
```

It works, we can see that Nginx as loaded our configuration and has enabled the gzip compression. When our client asks for it in its requests via the `"Accept-Encoding: gzip"` header, we can see the `"Content-Encoding: gzip"` header in the response.

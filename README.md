### set it up

```
# boostrap kong and postgres containers
bash dockers/up.sh

# install deps
yarn

# main script to setup the JWT plugin
DEBUG=app:* node setup.js
```

to check kong logs

```
docker ps
# assume the container name of kong is dockers_kong_1
docker exec -it dockers_kong_1 sh
cd /usr/local/kong/logs/
tail -f access.log
```


### tear down

```bash
# containers will be removed
bash dockers/down.sh
```

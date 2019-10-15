
```
bash dockers/up.sh

DEBUG=app:* node test.js
```

to check kong logs

```
docker ps
docker exec -it dockers_kong_1 sh
cd /usr/local/kong/logs/
tail -f access.log
```


### tear down

```bash
# containers will be removed
bash dockers/down.sh
```

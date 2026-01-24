# Install postgres container 

```bash
docker run -d `                   
>>   --name bank-postgres `                                                
>>   -e POSTGRES_DB=bank `
>>   -e POSTGRES_USER=root `
>>   -e POSTGRES_PASSWORD=root `
>>   -p 5432:5432 `
>>   -v bank_pgdata:/var/lib/postgresql/data `
>>   postgres:15-alpine
```

# Start App 

`cd server`
`yarn install`

If yarn not installed run : 
`npm install --global yarn`

`yarn run start`
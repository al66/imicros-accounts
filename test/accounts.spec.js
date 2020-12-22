"use strict";

const { ServiceBroker } = require("moleculer");
const { Accounts } = require("../index");
const { SecretsMixin } = require("imicros-minio");
const fs = require("fs");

// helper & mocks
const { ACL, ACLMiddleware, meta, ownerId } = require("./helper/acl");
const { Keys } = require("./helper/keys");

//const timestamp = Date.now();
process.env.JWT_SECRET = fs.readFileSync("dev/private.pem");

beforeAll( async () => {
});

afterAll( async () => {
});

describe("Test group service", () => {

    let broker, service;
    beforeAll( async () => {
    });

    afterAll(async () => {
    });
    
    describe("Test create service", () => {

        it("it should be created", async () => {
            broker = new ServiceBroker({
                middlewares: [ACLMiddleware],
                logger: console,
                logLevel: "info" //"debug"
            });
            service = broker.createService(Accounts, Object.assign({ 
                mixins: [SecretsMixin({ service: "keys" })],
                dependencies: ["keys"],
                settings: { 
                    uri: process.env.URI || "bolt://localhost:7687",
                    user: "neo4j",
                    password: "neo4j"
                } 
            }));
            // Start additional services
            [ACL, Keys].map(service => { return broker.createService(service); }); 
            await broker.start();
            expect(service).toBeDefined();
        });

    });

    describe("Test account service", () => {
    
        let opts, accounts = [], token = [], credentials;
        
        beforeEach(() => {
            opts = { };
        });
        
        
        it("it should add an account", async () => {
            let params = {
                label: "my first account"
            };
            return broker.call("account.create", params, opts).then(res => {
                expect(res).toBeDefined();
                expect(res).toEqual(expect.objectContaining({
                    accountId: expect.any(String)
                }));
                accounts.push(res);
            });
        });

        it("it should get the account", async () => {
            let params = {
                accountId: accounts[0].accountId
            };
            return broker.call("account.get", params, opts).then(res => {
                expect(res).toBeDefined();
                expect(res).toEqual(expect.objectContaining({
                    accountId: expect.any(String),
                    label: "my first account",
                    token: []
                }));
            });
        });

        it("it should get all accounts", async () => {
            let params = {
            };
            return broker.call("account.getAll", params, opts).then(res => {
                expect(res).toBeDefined();
                expect(res.length).toEqual(1);
                expect(res).toContainEqual(expect.objectContaining({
                    accountId: expect.any(String),
                    label: "my first account",
                    token: []
                }));
            });
        });

        it("it should generate an authToken", async () => {
            let params = {
                accountId: accounts[0].accountId
            };
            return broker.call("account.generateAuthToken", params, opts).then(res => {
                expect(res).toBeDefined();
                // { tokenId, created, expire, authToken }
                expect(res).toEqual(expect.objectContaining({
                    tokenId: expect.any(String),
                    created: expect.any(Number),
                    expire: 1000 * 60 * 60 * 24 * 365,
                    authToken: expect.any(String)
                }));
                token.push(res);
            });
        });

        it("it should get the authToken", async () => {
            let params = {
                accountId: accounts[0].accountId,
                tokenId: token[0].tokenId
            };
            return broker.call("account.getAuthToken", params, opts).then(res => {
                expect(res).toBeDefined();
                // { tokenId, created, expire, authToken }
                expect(res).toEqual(expect.objectContaining({
                    tokenId: token[0].tokenId,
                    created: token[0].created,
                    expire: 1000 * 60 * 60 * 24 * 365,
                    authToken: token[0].authToken
                }));
            });
        });

        it("it should generate a second authToken", async () => {
            let params = {
                accountId: accounts[0].accountId
            };
            return broker.call("account.generateAuthToken", params, opts).then(res => {
                expect(res).toBeDefined();
                // { tokenId, created, expire, authToken }
                expect(res).toEqual(expect.objectContaining({
                    tokenId: expect.any(String),
                    created: expect.any(Number),
                    expire: 1000 * 60 * 60 * 24 * 365,
                    authToken: expect.any(String)
                }));
                token.push(res);
            });
        });
        
        it("it should get the account with token", async () => {
            let params = {
                accountId: accounts[0].accountId
            };
            return broker.call("account.get", params, opts).then(res => {
                expect(res).toBeDefined();
                expect(res).toEqual(expect.objectContaining({
                    accountId: expect.any(String),
                    label: "my first account",
                    token: expect.any(Array)
                }));
                expect(res.token).toContainEqual(expect.objectContaining({
                    tokenId: token[0].tokenId,
                    expire: token[0].expire,
                    created: token[0].created
                }));
                expect(res.token).toContainEqual(expect.objectContaining({
                    tokenId: token[1].tokenId,
                    expire: token[1].expire,
                    created: token[1].created
                }));
            });
        });


        it("it should get all accounts", async () => {
            let params = {
            };
            return broker.call("account.getAll", params, opts).then(res => {
                expect(res).toBeDefined();
                expect(res).toContainEqual(expect.objectContaining({
                    accountId: expect.any(String),
                    label: "my first account",
                    token: expect.any(Array)
                }));
                expect(res[0].token).toContainEqual(expect.objectContaining({
                    tokenId: token[0].tokenId,
                    expire: token[0].expire,
                    created: token[0].created
                }));
                expect(res[0].token).toContainEqual(expect.objectContaining({
                    tokenId: token[1].tokenId,
                    expire: token[1].expire,
                    created: token[1].created
                }));
            });
        });

        it("it should login", async () => {
            let params = {
                accountId: accounts[0].accountId,
                authToken: token[0].authToken
            };
            return broker.call("account.login", params, opts).then(res => {
                expect(res).toBeDefined();
                expect(res).toEqual(expect.objectContaining({
                    sessionToken: expect.any(String),
                    accessToken: expect.any(String)
                }));
                credentials = res;
                console.log(res);
            });
        });
        
        it("it should verify session token", async () => {
            let params = {
                sessionToken: credentials.sessionToken
            };
            return broker.call("account.verify", params, opts).then(res => {
                expect(res).toBeDefined();
                console.log(res);
                expect(res).toEqual(expect.objectContaining({
                    accountId: accounts[0].accountId,
                    label: "my first account",
                    ownerId: ownerId
                }));
            });
        });
        
        it("it should delete the authToken", async () => {
            let params = {
                accountId: accounts[0].accountId,
                tokenId: token[0].tokenId
            };
            return broker.call("account.removeAuthToken", params, opts).then(res => {
                expect(res).toBeDefined();
                expect(res).toEqual(true);
            });
        });

        it("it should delete an account", async () => {
            let params = {
                accountId: accounts[0].accountId
            };
            return broker.call("account.delete", params, opts).then(res => {
                expect(res).toBeDefined();
                expect(res).toEqual(true);
            });
        });

    });
    
    describe("Test stop broker", () => {
        it("should stop the broker", async () => {
            expect.assertions(1);
            await broker.stop();
            expect(broker).toBeDefined();
        });
    });        
});
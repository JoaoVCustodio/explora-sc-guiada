import assert from "node:assert/strict";
import test from "node:test";
import { clearPending, readPending, writePending } from "./pending.ts";

test("pending generation survives reload, isolates accounts and concurrent tabs", () => {
  const entries = new Map<string,string>();
  const original = Object.getOwnPropertyDescriptor(globalThis,"localStorage");
  const storage = {
    get length() { return entries.size; }, key: (index: number) => [...entries.keys()][index] ?? null,
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string,value: string) => { entries.set(key,value); },
    removeItem: (key: string) => { entries.delete(key); },
  };
  Object.defineProperty(globalThis,"localStorage",{configurable:true,value:storage});
  const a = {id:"11111111-1111-4111-8111-111111111111",input:{days:3,preferences:"Praias",interests:[],regions:["Grande Florianópolis"]}};
  const b = {...a,id:"22222222-2222-4222-8222-222222222222"};
  try {
    assert.equal(readPending("owner"),null);
    writePending("owner",a);
    assert.deepEqual(readPending("owner"),a);
    assert.equal(readPending("other"),null);
    writePending("owner",b);
    clearPending("owner",b.id);
    assert.deepEqual(readPending("owner"),a,"a rejected second tab must not erase the first request");
    clearPending("owner",a.id);
    entries.set('explorasc:pending-generation:owner:corrupt','not json');
    writePending("owner",b);
    assert.deepEqual(readPending("owner"),b);
    const dated = {...b,input:{...b.input,startDate:"2026-11-16"}};
    writePending("owner",dated);
    assert.deepEqual(readPending("owner"),dated,"date must survive reload and replay without changing the request");
    storage.setItem=()=>{throw new Error("Storage blocked");};
    assert.throws(()=>writePending("owner",a),"must fail before a chargeable request if persistence fails");
  } finally {
    if (original) Object.defineProperty(globalThis,"localStorage",original);
    else Reflect.deleteProperty(globalThis,"localStorage");
  }
});

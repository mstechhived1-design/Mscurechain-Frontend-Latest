const { NextResponse } = require('next/server');
const stream = new ReadableStream({
    start(controller) {
        controller.enqueue(new TextEncoder().encode('{"message":"Invalid credentials"}'));
        controller.close();
    }
});
const headers = new Headers();
headers.set('content-type', 'application/json; charset=utf-8');
const res = new NextResponse(stream, { headers });
console.log(res.headers.get('content-type'));

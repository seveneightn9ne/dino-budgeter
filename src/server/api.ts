import {Request, Response} from 'express';

// Wrap an async handler to be called synchronously
export const wrap = function(handler: (req: Request, res: Response)=>Promise<void>): (req: Request, res: Response)=>void {
    return function(req: Request, res: Response, ) {
        handler(req, res).catch((err) => {
            console.log("Error (caught)", err);
            const status = 500;
            res.status(status).send({
                "error": {
                    "status": status,
                    "message": "internal server error",
                }
            });
        })
    };
}

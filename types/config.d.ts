export type ServerlessQcloudConfig = {
    service: string

    provider: {
        name: 'qcloud'
        region?: 'bj' | 'sh' | 'gz'
        runtime?: 'nodejs6.10' | 'python2.7' | 'python3.6' | 'java8'
        memorySize?: 128 | 256 | 384 | 512 | 640 | 768 | 896 | 1024 | 1152 | 1280 | 1408 | 1536
        /** 1-300s, default: 3 */
        timeout?: number
        credentials?: string
        deploymentBucket?: string | {
            name: string
        }
        apiGateway?: string | {
            name: string
            description?: string
            protocol?: 'http' | 'https' | 'http&https'
        }
    }

    plugins?: string[]

    package?: {
        include?: string[]
        exclude?: string[]
    }

    functions?: {
        [name: string]: {
            /**
             * pattern `fileName.functionName`
             * @type match /^[\w-]{2,60}$/i
             */
            handler: string

            /**
             * @type match /^[0-9a-z,\. ]{0,1000}$/i
             */
            description?: string

            /** Runtime language */
            runtime?: 'nodejs6.10' | 'python2.7' | 'python3.6' | 'java8'

            /** Runtime memory size */
            memorySize?: 128 | 256 | 384 | 512 | 640 | 768 | 896 | 1024 | 1152 | 1280 | 1408 | 1536

            /** 1-300s, default: 3 */
            timeout?: number

            /** Merge into `process.env` */
            environment?: {
                [name: string]: string
            }

            /**
             * Function triggers cannot more than 4.
             */
            events?: {
                /** API Gateway */
                http?: {
                    method?: 'get' | 'post' | 'put' | 'delete' | 'head' | 'options' | 'patch'
                    path: string
                    description?: string
                    private?: boolean
                }

                /**
                 * COS trigger cannot update.
                 */
                cos?: {
                    /** Bucket name. Region must same. */
                    name?: string

                    /**
                     * Trigger event
                     * 1. Cannot change event between `cos:ObjectCreated:*` and another starts with `cos:ObjectCreated`.
                     * 2. The rule 1 fit `cos:ObjectRemove:*` also.
                     * 
                     * @see https://cloud.tencent.com/document/api/583/9748#.E8.AF.B7.E6.B1.82.E5.8F.82.E6.95.B0
                     */
                    event: 'cos:ObjectCreated:*' | 'cos:ObjectCreated:Put' | 'cos:ObjectCreated:Post' | 'cos:ObjectCreated:Copy' | 'cos:ObjectCreated:Append' | 'cos:ObjectCreated:CompleteMultipartUpload' | 'cos:ObjectRemove:*' | 'cos:ObjectRemove:Delete' | 'cos:ObjectRemove:DeleteMarkerCreated'
                }

                cmq?: {
                    /** CMQ Topic name */
                    name?: string
                }

                timer?: {
                    /**
                     * Timer trigger name. Cannot update.
                     * @type match /^[\w-]{0,100}$/i
                     */
                    name?: string

                    /** Linux cron expression */
                    cron: string
                }
            }[]
        }
    }
}

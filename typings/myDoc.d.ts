interface IOptions {
    isTemplate: boolean;
}
export default function generateDoc(docPath: string, options?: IOptions): Promise<void>;
export {};

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Field } from "@/types/konnectify-dsl";
import { cn } from "@/utils/utils";
import JsonEditor from "../JsonEditor";

interface InputFieldsProps {
  selectedTrigger: string | undefined;
  isConfigDataManual: boolean;
  setIsConfigDataManual: (val: boolean) => void;
  configData: string;
  setConfigData: (val: React.SetStateAction<string>) => void;
  configFields: Field[] | undefined;
  isConfigFieldsLoading: boolean;
}

const InputFields = ({
  selectedTrigger,
  isConfigDataManual,
  setIsConfigDataManual,
  configData,
  setConfigData,
  configFields,
  isConfigFieldsLoading,
}: InputFieldsProps) => {
  return (
    <div>
      <div className="flex-shrink-0">
        <div className="flex justify-between items-center">
          <label className="text-xs text-gray-300 mb-1 block">Input: </label>
          <div className="flex border-b border-[#1e1e1e] bg-[#2d2d30] rounded overflow-hidden text-gray-300">
            <Button
              onClick={() => setIsConfigDataManual(true)}
              size="sm"
              className={cn(
                "rounded-none border-r border-gray-600 text-gray-300",
                isConfigDataManual ? "bg-[#1e1e1e] text-white" : "bg-[#2d2d30] text-[#969696]"
              )}
            >
              {"{}"}
            </Button>
            <Button
              onClick={() => setIsConfigDataManual(false)}
              size="sm"
              className={cn(
                "rounded-none border-r border-gray-600 text-gray-300",
                !isConfigDataManual ? "bg-[#1e1e1e] text-white" : "bg-[#2d2d30] text-[#969696]"
              )}
            >
              Load
            </Button>
          </div>
        </div>
        {isConfigDataManual ? (
          <div className="mb-5">
            <label className="text-xs text-gray-300 mb-1 block">Config Fields (JSON)</label>
            <JsonEditor value={configData} onChange={setConfigData} placeholder="{}" height="120px" />
          </div>
        ) : !selectedTrigger ? (
          <p className="text-red-400 text-sm m-3"> Select a trigger first!</p>
        ) : isConfigFieldsLoading ? (
          <Spinner text="Loading config fields" size="sm" />
        ) : !configFields ? (
          <p className="text-red-400 text-sm m-3"> Error loading config fields</p>
        ) : (
          configFields?.map((field) => (
            <div key={field.name} className="mb-5">
              <label key={field.name} className="text-xs text-gray-300 mb-1 block">
                {field?.label || field.name}
              </label>
              <Input
                className="text-xs font-mono"
                type={field.type}
                name={field.name}
                placeholder={`Enter ${field.name}`}
                value={JSON.parse(configData)?.[field.name] || ""}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setConfigData((prev: string) => JSON.stringify({ ...JSON.parse(prev), [field.name]: e.target.value }))
                }
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default InputFields;

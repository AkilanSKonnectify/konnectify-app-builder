import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Field } from "@/types/konnectify-dsl";
import { cn } from "@/utils/utils";
import JsonEditor from "../JsonEditor";

interface InputFieldsProps {
  selectedAction: string | undefined;
  hasConfigFields: boolean | undefined;
  isInputDataManual: boolean;
  setIsInputDataManual: (val: boolean) => void;
  configData: string;
  setConfigData: (val: React.SetStateAction<string>) => void;
  inputData: string;
  setInputData: (val: React.SetStateAction<string>) => void;
  configFields: Field[] | undefined;
  isConfigFieldsLoading: boolean;
  inputFields: Field[] | undefined;
  isInputFieldsLoading: boolean;
  testTab: "config" | "input" | "execute" | "output";
}

const InputFields = ({
  selectedAction,
  hasConfigFields,
  isInputDataManual,
  setIsInputDataManual,
  configData,
  setConfigData,
  inputData,
  setInputData,
  configFields,
  isConfigFieldsLoading,
  inputFields,
  isInputFieldsLoading,
  testTab,
}: InputFieldsProps) => {
  return (
    <div>
      <div className="flex-shrink-0">
        <div className="flex justify-between items-center">
          <label className="text-md text-gray-300 mb-1 block">Input: </label>
          <div className="flex border-b border-[#1e1e1e] bg-[#2d2d30] rounded overflow-hidden text-gray-300">
            <Button
              onClick={() => setIsInputDataManual(true)}
              size="sm"
              className={cn(
                "rounded-none border-r border-gray-600 text-gray-300",
                isInputDataManual ? "bg-[#1e1e1e] text-white" : "bg-[#2d2d30] text-[#969696]"
              )}
            >
              {"{}"}
            </Button>
            <Button
              onClick={() => setIsInputDataManual(false)}
              size="sm"
              className={cn(
                "rounded-none border-r border-gray-600 text-gray-300",
                !isInputDataManual ? "bg-[#1e1e1e] text-white" : "bg-[#2d2d30] text-[#969696]"
              )}
            >
              Load
            </Button>
          </div>
        </div>
        {isInputDataManual ? (
          <div className="flex-shrink-0">
            {hasConfigFields && (
              <div className="mb-2">
                <label className="text-xs text-gray-300 mb-1 block">Config Fields (JSON)</label>
                <JsonEditor value={configData} onChange={setConfigData} placeholder="{}" height="120px" />
              </div>
            )}
            <div className="mb-5">
              <label className="text-xs text-gray-300 mb-1 block">Input Fields (JSON)</label>
              <JsonEditor value={inputData} onChange={setInputData} placeholder="{}" height="120px" />
            </div>
          </div>
        ) : !selectedAction ? (
          <p className="text-red-400 text-sm m-3"> Select a action first!</p>
        ) : (
          <>
            {hasConfigFields && (
              <>
                <label className="text-xs text-gray-300 mb-1 block">Config Fields (JSON)</label>
                {isConfigFieldsLoading ? (
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
                          setConfigData((prev: string) =>
                            JSON.stringify({ ...JSON.parse(prev), [field.name]: e.target.value })
                          )
                        }
                      />
                    </div>
                  ))
                )}
              </>
            )}
            {testTab == "execute" &&
              (isInputFieldsLoading ? (
                <Spinner text="Loading input fields" size="sm" />
              ) : (
                inputFields?.map((field) => (
                  <div key={field.name} className="mb-5">
                    <label key={field.name} className="text-xs text-gray-300 mb-1 block">
                      {field?.label || field.name}
                    </label>
                    <Input
                      className="text-xs font-mono"
                      type={field.type}
                      name={field.name}
                      placeholder={`Enter ${field.name}`}
                      value={JSON.parse(inputData)?.[field.name] || ""}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setInputData((prev: string) =>
                          JSON.stringify({ ...JSON.parse(prev), [field.name]: e.target.value })
                        )
                      }
                    />
                  </div>
                ))
              ))}
          </>
        )}
      </div>
    </div>
  );
};

export default InputFields;

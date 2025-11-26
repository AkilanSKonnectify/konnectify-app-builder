import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Field, PickListValue } from "@/types/konnectify-dsl";
import { cn } from "@/utils/utils";
import JsonEditor from "../JsonEditor";
import { useEffect, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, ChevronRight } from "lucide-react";

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
  const [collapseFields, setCollapseFields] = useState(false);
  const [parsedConfigData, setParsedConfigData] = useState<{ [key: string]: string }>(() => {
    try {
      return JSON.parse(configData);
    } catch (err) {
      console.warn("Unable to parse the JSON. Error: ", String(err));
      return {};
    }
  });
  const [parsedInputData, setParsedInputData] = useState<{ [key: string]: string }>(() => {
    try {
      return JSON.parse(inputData);
    } catch (err) {
      console.warn("Unable to parse the JSON. Error: ", String(err));
      return {};
    }
  });

  useEffect(() => {
    setConfigData(JSON.stringify(parsedConfigData));
  }, [parsedConfigData]);

  useEffect(() => {
    setInputData(JSON.stringify(parsedInputData));
  }, [parsedInputData]);

  return (
    <div>
      <div className="flex-shrink-0">
        <div className="flex justify-between items-center">
          <div className="flex items-center justify-center">
            <button onClick={() => setCollapseFields(!collapseFields)}>
              {collapseFields ? <ChevronRight className="w-4 h-4 mr-2" /> : <ChevronDown className="w-4 h-4 mr-2" />}
            </button>
            <label className="text-md text-gray-300 mb-1 block">Input: </label>
          </div>
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
        {!collapseFields &&
          (isInputDataManual ? (
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
                        <div className="rounded-md border file:border-0 flex items-center justify-center">
                          <Input
                            className="text-xs font-mono border-none"
                            type={field.type}
                            name={field.name}
                            placeholder={`Enter ${field.name}`}
                            value={parsedConfigData?.[field.name] || ""}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              setParsedConfigData((prev) => ({ ...prev, [field.name]: e.target.value }))
                            }
                          />
                          {"pick_list" in field && (
                            <DropdownMenu>
                              <DropdownMenuTrigger className="w-1/6 border-l-gray-500">
                                <ChevronDown className="h-4 opacity-50" />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent className="bg-[#252526] border border-slate-700 text-gray-100">
                                {(field?.pick_list as any)?.map((option: PickListValue) => (
                                  <DropdownMenuGroup>
                                    <DropdownMenuItem
                                      className="text-xs text-gray-300 bg-grey-500 border border-slate-700 hover:bg-gray-700 hover:text-white cursor-pointer"
                                      key={option?.value}
                                      onSelect={() => {
                                        setParsedConfigData((prev) => ({
                                          ...prev,
                                          [field.name]: (parsedConfigData[field.name] || "") + option?.value,
                                        }));
                                      }}
                                    >
                                      {option?.label || option?.value}
                                    </DropdownMenuItem>
                                  </DropdownMenuGroup>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
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
                      <div className="rounded-md border file:border-0 flex items-center justify-center">
                        <Input
                          className="text-xs font-mono border-none"
                          type={field.type}
                          name={field.name}
                          placeholder={`Enter ${field.name}`}
                          value={parsedInputData?.[field.name] || ""}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setParsedInputData((prev) => ({ ...prev, [field.name]: e.target.value }))
                          }
                        />
                        {"pick_list" in field && (
                          <DropdownMenu>
                            <DropdownMenuTrigger className="w-1/6 border-l-gray-500">
                              <ChevronDown className="h-4 opacity-50" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="bg-[#252526] border border-slate-700 text-gray-100">
                              {(field?.pick_list as any)?.map((option: PickListValue) => (
                                <DropdownMenuGroup>
                                  <DropdownMenuItem
                                    className="text-xs text-gray-300 bg-grey-500 border border-slate-700 hover:bg-gray-700 hover:text-white cursor-pointer"
                                    key={option.value}
                                    onSelect={() => {
                                      setParsedInputData((prev) => ({
                                        ...prev,
                                        [field.name]: (parsedInputData[field.name] || "") + option.value,
                                      }));
                                    }}
                                  >
                                    {option.label || option.value}
                                  </DropdownMenuItem>
                                </DropdownMenuGroup>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>
                  ))
                ))}
            </>
          ))}
      </div>
    </div>
  );
};

export default InputFields;

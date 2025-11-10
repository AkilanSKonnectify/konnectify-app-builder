import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/types/konnectify-dsl";
import { FileData } from "@/types/localStorage";
import { cn } from "@/utils/utils";

interface PollTriggerProps {
  selectedTrigger: string | undefined;
  isConfigDataManual: boolean;
  setIsConfigDataManual: (val: boolean) => void;
  configData: string;
  setConfigData: (val: React.SetStateAction<string>) => void;
  configFields: Field[] | undefined;
  isConfigFieldsLoading: boolean;
  additionalTriggerData: string;
  setAdditionalTriggerData: (val: React.SetStateAction<string>) => void;
  handleTestTrigger: () => void;
  isLoading: boolean;
  activeFile: FileData | undefined;
  testResult: any;
}

const PollTrigger = ({
  selectedTrigger,
  isConfigDataManual,
  setIsConfigDataManual,
  configData,
  setConfigData,
  configFields,
  isConfigFieldsLoading,
  additionalTriggerData,
  setAdditionalTriggerData,
  handleTestTrigger,
  isLoading,
  activeFile,
  testResult,
}: PollTriggerProps) => {
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
            <Textarea
              value={configData}
              onChange={(e) => setConfigData(e.target.value)}
              placeholder="{}"
              className="min-h-[60px] text-xs font-mono"
            />
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

      <div className="flex-shrink-0">
        <label className="text-xs text-gray-300 mb-1 block">Additional data (JSON)</label>
        <Textarea
          value={additionalTriggerData}
          onChange={(e) => setAdditionalTriggerData(e.target.value)}
          placeholder='{"since": "2024-01-01T00:00:00Z", "till": "2024-12-31T23:59:59Z", "cursor": null}'
          className="min-h-[60px] text-xs font-mono"
        />
      </div>

      <Button
        onClick={handleTestTrigger}
        disabled={isLoading || !activeFile || !selectedTrigger}
        className="w-full flex-shrink-0 border rounded-sm mt-3"
        size="sm"
      >
        {isLoading ? "Testing..." : "Test Trigger"}
      </Button>

      {testResult && (
        <div className="flex-1 flex flex-col min-h-32">
          <div className="flex items-center gap-2 mb-2 flex-shrink-0">
            <Badge variant={testResult.success ? "default" : "destructive"}>
              {testResult.success ? "Success" : "Failed"}
            </Badge>
          </div>
          <div className="bg-gray-800 p-2 rounded text-xs font-mono flex-1 min-h-32 overflow-auto scrollbar-hide">
            <pre className="whitespace-pre-wrap">{JSON.stringify(testResult.result || testResult.error, null, 2)}</pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default PollTrigger;

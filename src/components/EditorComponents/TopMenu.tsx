"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useEditor } from "@/context/EditorContext";
import { FilePlus, Upload, Github } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Spinner } from "@/components/ui/spinner";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

export default function TopMenu() {
  const { createNewFile, uploadFile, files, activeFileId } = useEditor();
  const activeFile = files.find((f) => f.id === activeFileId);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isDeployModalOpen, setIsDeployModalOpen] = useState(false);
  const [deployFields, setDeployFields] = useState({
    appId: "",
    appVersion: "",
    appName: "",
    hasTriggers: false,
    hasActions: false,
    appCode: "",
    commitMessage: "Working model",
  });
  const [deploymentEnv, setDeploymentEnv] = useState<"PreStaging" | "Staging" | "Production">("PreStaging");
  const [loading, setLoading] = useState(false);

  const { toast } = useToast();

  // Check valid fields:
  const isCreateFormValid = useMemo(() => {
    return (
      deployFields.appId.trim() !== "" &&
      deployFields.appVersion.trim() !== "" &&
      deployFields.appName.trim() !== "" &&
      deployFields.appCode.trim() !== "" &&
      deployFields.commitMessage.trim() !== "" &&
      typeof deployFields.hasTriggers == "boolean" &&
      typeof deployFields.hasTriggers == "boolean"
    );
  }, [deployFields]);

  const DEPLOY_ENV_MAP = {
    PreStaging: "https://container.prestaging.us.konnectify.dev",
    Staging: "https://container.staging.us.konnectify.dev",
    Production: "https://container.us.konnectifyapp.co",
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setDeployFields((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  useEffect(() => {
    let code = activeFile?.content;
    if (!code) code = "";
    setDeployFields((prev) => ({
      ...prev,
      appCode: String(code),
    }));
  }, [activeFile]);

  const handlePublishApp = async () => {
    if (!isCreateFormValid) return;
    try {
      setLoading(true);
      const envUrl = DEPLOY_ENV_MAP[deploymentEnv];
      const resp = await fetch(`${envUrl}/ui/apps/${deployFields.appId}/publish-app`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(deployFields),
      });
      if (!resp.ok) throw new Error(await resp.text());
      toast({ title: "Success", description: "Successfully published app!" });
      setIsDeployModalOpen(false);
    } catch (err: any) {
      toast({ title: "Publish failed", description: err?.message ?? String(err), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await uploadFile(file);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="h-10 bg-[#2d2d30] border-b border-[#1e1e1e] flex justify-between">
      <div className="h-10 bg-[#2d2d30] border-b border-[#1e1e1e] flex items-center px-4 gap-1">
        <button
          onClick={createNewFile}
          title="New File (Ctrl+N)"
          className="px-2 py-1.5 bg-transparent text-[#cccccc] border-none cursor-pointer flex items-center gap-1.5 text-[13px] transition-colors hover:bg-[#3e3e42]"
        >
          <FilePlus size={16} />
          <span>New File</span>
        </button>

        <button
          onClick={handleUploadClick}
          title="Open File (Ctrl+O)"
          className="px-2 py-1.5 bg-transparent text-[#cccccc] border-none cursor-pointer flex items-center gap-1.5 text-[13px] transition-colors hover:bg-[#3e3e42]"
        >
          <Upload size={16} />
          <span>Open File</span>
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".ts,.tsx,.js,.jsx,.json,.html,.css,.md,.txt,.py,.java,.cpp,.c,.go,.rs,.php,.rb,.sql,.xml,.yaml,.yml"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
      <div className="px-4">
        <button
          onClick={() => setIsDeployModalOpen(true)}
          title="New File (Ctrl+N)"
          className="m-1 px-1.5 py-1 bg-transparent text-[#cccccc] border rounded-full border-[#cccccc] cursor-pointer flex items-center gap-1.5 text-[13px] transition-colors hover:bg-[#3e3e42]"
        >
          <Github size={16} />
          <span>Publish</span>
        </button>
      </div>
      <Modal
        isOpen={isDeployModalOpen}
        onClose={() => setIsDeployModalOpen(false)}
        className="max-w-[800px] p-5 lg:p-10"
      >
        <h4 className="font-semibold text-white mb-7 text-title-sm">Publish App</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-white mb-1.5">
              Deployment Environment <span className="text-red-400">*</span>
            </label>
            <Select
              value={deploymentEnv}
              onValueChange={(value) => setDeploymentEnv(value as "PreStaging" | "Staging" | "Production")}
            >
              <SelectTrigger className="w-full bg-gray-800 text-white border-gray-600">
                <SelectValue className="text-white" />
              </SelectTrigger>
              <SelectContent className="z-[2147483648] bg-gray-800 border-gray-600">
                <SelectItem value="PreStaging" className="text-white hover:bg-gray-700">
                  PreStaging
                </SelectItem>
                <SelectItem value="Staging" className="text-white hover:bg-gray-700">
                  Staging
                </SelectItem>
                <SelectItem value="Production" className="text-white hover:bg-gray-700">
                  Production
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium text-white mb-1.5">
              App id <span className="text-red-400">*</span>
            </label>
            <Input
              type="text"
              name="appId"
              placeholder="Enter app id"
              value={deployFields.appId}
              onChange={handleInputChange}
              maxLength={30}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-white mb-1.5">
              App name <span className="text-red-400">*</span>
            </label>
            <Input
              type="text"
              name="appName"
              placeholder="Enter app name"
              value={deployFields.appName}
              onChange={handleInputChange}
              maxLength={30}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-white mb-1.5">
              App version <span className="text-red-400">*</span>
            </label>
            <Input
              type="text"
              name="appVersion"
              placeholder="Enter app version"
              value={deployFields.appVersion}
              onChange={handleInputChange}
              maxLength={30}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-white mb-1.5">
              Has Triggers <span className="text-red-400">*</span>
            </label>
            <Switch
              checked={deployFields.hasTriggers}
              onCheckedChange={(isChecked: boolean) =>
                setDeployFields((prev) => ({
                  ...prev,
                  hasTriggers: isChecked,
                }))
              }
              className="data-[state=checked]:bg-blue-600 data-[state=unchecked]:bg-gray-600 border-2 border-gray-500 data-[state=checked]:border-blue-500 data-[state=unchecked]:border-gray-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-white mb-1.5">
              Has Actions <span className="text-red-400">*</span>
            </label>
            <Switch
              checked={deployFields.hasActions}
              onCheckedChange={(isChecked: boolean) =>
                setDeployFields((prev) => ({
                  ...prev,
                  hasActions: isChecked,
                }))
              }
              className="data-[state=checked]:bg-blue-600 data-[state=unchecked]:bg-gray-600 border-2 border-gray-500 data-[state=checked]:border-blue-500 data-[state=unchecked]:border-gray-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-white mb-1.5">Commit message</label>
            <Input
              type="text"
              name="commitMessage"
              placeholder="Enter commint message"
              value={deployFields.commitMessage}
              onChange={handleInputChange}
              maxLength={30}
            />
          </div>
        </div>
        <div className="flex items-center justify-end w-full gap-3 mt-8">
          <Button size="sm" variant="outline" onClick={() => setIsDeployModalOpen(false)}>
            Cancel
          </Button>
          <Button size="sm" onClick={handlePublishApp} disabled={loading || !isCreateFormValid}>
            {loading ? (
              <div className="flex items-center gap-2">
                <Spinner size="sm" />
                <span>Publishing...</span>
              </div>
            ) : (
              "Publish"
            )}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

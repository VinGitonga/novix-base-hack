import { Chip } from "@heroui/chip";
import { Tab, Tabs } from "@heroui/tabs";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { HiOutlineCloudUpload } from "react-icons/hi";
import { Button } from "@heroui/button";
import { LuMinus, LuPlus } from "react-icons/lu";
import { addToast, Alert, Divider } from "@heroui/react";
import { z } from "zod";
import { FormProvider, useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import AppInput from "@/components/forms/AppInput";
import AppTextarea from "@/components/forms/AppTextarea";
import AppSelect from "@/components/forms/AppSelect";
import { generateOptions } from "@/lib/utils";
import { IOption } from "@/types/Option";
import AppSwitch from "@/components/forms/AppSwitch";
import axios from "axios";
import { API_CUSTOMA_AGENTS_BASE_URL } from "@/env";
import useAgentUtils from "@/hooks/useAgentUtils";
import { useNavigate } from "react-router";
import { useAuthStore } from "@/hooks/store/useAuthStore";

type EnvItem = {
	key: string;
	value: string;
};

const pricingCategory = [
	{
		value: "free",
		label: "Free",
	},
	{
		value: "subscription",
		label: "Subscription",
	},
	{
		value: "one-time",
		label: "One-time",
	},
] satisfies IOption[];

const featuresSchema = z.object({
	name: z.string(),
	summary: z.string(),
});

const formSchema = z.object({
	agentName: z.string().min(1, { message: "Agent name is required" }),
	agentSummary: z.string().min(1, { message: "Agent summary is required" }),
	agentDescription: z.string().min(1, { message: "Agent description is required" }),
	categoryTags: z.string().min(1, { message: "Category/tags are required" }),
	inputExample: z.string().min(1, { message: "Input example is required" }),
	outputExample: z.string().min(1, { message: "Output example is required" }),
	pricingCategory: z.string().min(1, { message: "Pricing category is required" }),
	// transform to number
	price: z.coerce.string().transform((val) => {
		const parsed = parseFloat(val);
		if (isNaN(parsed)) {
			throw new Error("Invalid price");
		}
		return String(parsed);
	}),
	features: z.array(featuresSchema).min(1, { message: "Add atleast one feature detail" }),
});

const UploadAgent = () => {
	const [selectedKey, setSelectedKey] = useState<"general" | "technical" | "pricing">("general");
	const [selectedAgentFile, setSelectedAgentFile] = useState<File | null>(null);
	const [selectedRequirementsFile, setSelectedRequirementsFile] = useState<File | null>(null);
	const [envVariables, setEnvVariables] = useState<EnvItem[]>([{ key: "", value: "" }]);
	const [hasEnvVariables, setHasEnvVariables] = useState<boolean>(false);
	const [loading, setLoading] = useState<boolean>(false);

	const { createCustomAgent } = useAgentUtils();
	const navigate = useNavigate();

	const { account } = useAuthStore();

	const onDrop = useCallback(async <T extends File>(acceptedFiles: T[]) => {
		const agentFile = acceptedFiles.find((item) => item.name.endsWith(".py"));
		const requirementsFile = acceptedFiles.find((item) => item.name.includes(".txt"));
		if (agentFile) {
			setSelectedAgentFile(agentFile);
		}

		if (requirementsFile) {
			setSelectedRequirementsFile(requirementsFile);
		}
	}, []);

	const { getRootProps, getInputProps, isDragActive } = useDropzone({
		maxFiles: 2,
		accept: {
			".py": [],
			".txt": [],
		},
		onDrop,
	});

	const formMethods = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: { agentName: "", agentDescription: "", categoryTags: "", inputExample: "", outputExample: "", price: "0", pricingCategory: "", features: [{ name: "", summary: "" }] },
	});

	const {
		handleSubmit,
		formState: { errors: formErrors },
		control,
		reset,
	} = formMethods;

	const { fields, append, remove } = useFieldArray({ name: "features", control });

	const saveAgent = async (data: z.infer<typeof formSchema>, fastId: string) => {
		try {
			const info = {
				name: data.agentName,
				description: data.agentDescription,
				summary: data.agentSummary,
				price: parseFloat(data.price),
				pricingModel: data.pricingCategory,
				fastId,
				inputExample: data.inputExample,
				outputExample: data.outputExample,
				tags: [data.categoryTags],
				features: data.features,
				owner: account?._id,
			};
			await createCustomAgent(info);
		} catch (err) {}
	};

	const onSubmit = handleSubmit(async (data) => {
		if (!account) {
			addToast({ title: "Error", description: `Please setup your account first in order to create an agent`, severity: "warning" });
			return;
		}
		let envObj: Record<string, string> = {};
		Object.values(envVariables).forEach((item) => {
			envObj[item.key] = item.value;
		});
		setLoading(true);

		const formData = new FormData();
		formData.append("name", data.agentName);
		formData.append("description", data.agentDescription);
		formData.append("agent_file", selectedAgentFile!);
		formData.append("requirements_file", selectedRequirementsFile!);
		formData.append("env_vars", JSON.stringify(envObj));

		try {
			const rawResp = await axios.post(`${API_CUSTOMA_AGENTS_BASE_URL}/agents`, formData);

			const resp = rawResp.data;

			await saveAgent(data, resp.id);
			reset();
			addToast({ title: "Success", description: "Agent saved successfully", color: "primary" });
			navigate("/app/agents/my");
		} catch (err) {
			console.log("errerere", err);
		} finally {
			setLoading(false);
		}
	});

	const onPressAddEnvVariable = () => {
		const current = [...envVariables];
		current.push({ key: "", value: "" });
		setEnvVariables(current);
	};

	const onRemoveEnvVaribleObj = (idx: number) => {
		const current = [...envVariables];
		const newCurrent = current.filter((_, i) => i !== idx);
		setEnvVariables(newCurrent);
	};

	const handleEnvVariablesValues = (val: string, idx: number, variant: "key" | "value") => {
		const envItem = [...envVariables][idx];
		const updatedItem = { ...envItem, [variant]: val };
		const newItems = [...envVariables].map((item, i) => {
			if (i === idx) return updatedItem;
			return item;
		});
		setEnvVariables(newItems);
	};

	const appendFeatureItem = () => {
		append({ name: "", summary: "" });
	};

	return (
		<div className="dark">
			<div className="space-y-2">
				<h1 className="font-semibold text-lg">Upload & Publish Agent</h1>
				<p className="text-sm">Input the information below to publish your new AI Agent</p>
			</div>
			<div className="mt-4"></div>
			{Object.values(formErrors).length > 0 && <Alert color="danger" title={"Kindly fill all the required fields"} />}
			<FormProvider {...formMethods}>
				<form onSubmit={onSubmit}>
					<Tabs fullWidth selectedKey={selectedKey} onSelectionChange={(val) => setSelectedKey(val as any)} aria-label="Agents Information">
						<Tab key={"general"} title={"General Information"}>
							<div className="flex flex-col gap-y-5">
								<AppInput label={"Agent Name"} placeholder="e.g. Financial Agent" name="agentName" control={control} error={formErrors.agentName} />
								<AppTextarea label={"Agent Summary"} placeholder="Enter agent summary" name="agentSummary" control={control} error={formErrors.agentSummary} />
								<AppTextarea label={"Agent Description"} placeholder="Enter agent description" name="agentDescription" control={control} error={formErrors.agentDescription} />
								<AppSelect
									label={"Category/Tags"}
									name="categoryTags"
									options={generateOptions(["General", "Accounting", "Finance", "Ecommerce"])}
									control={control}
									error={formErrors.categoryTags!}
									placeholder="Choose ..."
								/>
								<p className="font-semibold">Features</p>
								{fields &&
									fields.map((field, idx) => (
										<div key={field.id}>
											<AppInput label={"Name"} placeholder="Name of the feature" name={`features.${idx}.name`} control={control} error={formErrors?.features?.[idx]?.name} />
											<AppTextarea label={"Summary"} placeholder="Describe this feature" name={`features.${idx}.summary`} control={control} error={formErrors?.features?.[idx]?.summary} />
											{fields.length > 1 && (
												<Button isIconOnly onPress={() => remove(idx)}>
													<LuMinus className="w-5 h-5" />
												</Button>
											)}
											<Divider />
										</div>
									))}
								<Button startContent={<LuPlus />} size={"sm"} onPress={appendFeatureItem}>
									Add Feature
								</Button>
								<Divider />
								<div className="flex items-center justify-end">
									<Button type="button" onPress={() => setSelectedKey("technical")}>
										Next
									</Button>
								</div>
							</div>
						</Tab>
						<Tab key={"technical"} title={"Technical Details"}>
							<div className="flex flex-col gap-y-5">
								<div className="mb-3 mt-5">
									<div {...getRootProps({ className: "border border-gray-200 py-12 rounded-2xl" })}>
										<input {...getInputProps()} />
										{isDragActive ? (
											<p className="text-lg font-semibold text-center">Drop the files here ...</p>
										) : (
											<div className="flex flex-col items-center justify-center space-y-4">
												<HiOutlineCloudUpload className="w-16 h-16" />
												<p className="font-normal">Click select to upload or Drop your files</p>
												<p className="font-normal text-sm">Python file and requirements.txt </p>
											</div>
										)}
									</div>
								</div>
								<div className="mb-3 flex ite gap-3">
									<div className="">{selectedAgentFile && <Chip>{selectedAgentFile.name}</Chip>}</div>
									<div className="">{selectedRequirementsFile && <Chip>{selectedRequirementsFile.name}</Chip>}</div>
								</div>
								<AppSwitch label="Add Environment Variables" isSelected={hasEnvVariables} setIsSelected={setHasEnvVariables} />
								{hasEnvVariables && (
									<>
										<div className="space-y-2">
											{envVariables.map((_, idx) => (
												<div key={idx} className="grid grid-cols-2 gap-x-2 mb-2">
													<AppInput label={"KEY"} placeholder="e.g. OPENAI_APIKEY" value={envVariables[idx].key} setValue={(val) => handleEnvVariablesValues(val, idx, "key")} />
													<div className="flex gap-1 items-baseline">
														<AppInput label={"VALUE"} placeholder="e.g. OPENAI_APIKEY" value={envVariables[idx].value} setValue={(val) => handleEnvVariablesValues(val, idx, "value")} />
														{envVariables.length > 1 && (
															<Button isIconOnly onPress={() => onRemoveEnvVaribleObj(idx)}>
																<LuMinus className="w-5 h-5" />
															</Button>
														)}
													</div>
												</div>
											))}
											<Button startContent={<LuPlus />} size={"sm"} onPress={onPressAddEnvVariable}>
												Add
											</Button>
										</div>
										<Divider />
									</>
								)}
								<AppTextarea label={"Sample Interaction"} placeholder="Financial analysis for Uber" name="inputExample" control={control} error={formErrors.inputExample} />
								<AppTextarea label={"Sample Output"} placeholder="Uber finances for the last 10 years have been okay" name="outputExample" control={control} error={formErrors.outputExample} />
								<div className="flex items-center justify-between">
									<Button type="button" onPress={() => setSelectedKey("general")}>
										Prev
									</Button>
									<Button type="button" onPress={() => setSelectedKey("pricing")}>
										Next
									</Button>
								</div>
							</div>
						</Tab>
						<Tab key={"pricing"} title={"Pricing Information"}>
							<div className="flex flex-col gap-5">
								<AppSelect label={"Pricing Category"} name="pricingCategory" options={pricingCategory} control={control} error={formErrors.pricingCategory!} placeholder="Choose ..." />
								<AppInput label={"Amount"} name="price" control={control} error={formErrors.price} placeholder="e.g 10" />
								<div className="flex items-center justify-between">
									<Button type="button" onPress={() => setSelectedKey("general")}>
										Prev
									</Button>
									<Button type="submit" isLoading={loading} disabled={loading}>
										Submit
									</Button>
								</div>
							</div>
						</Tab>
					</Tabs>
				</form>
			</FormProvider>
		</div>
	);
};

export default UploadAgent;

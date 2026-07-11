"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, CircleUserRound, Clock3, ListTodo } from "lucide-react";
import { api } from "@/lib/api/client";
import type { ActionItem } from "@/domain/types";
import { ApiUnavailable, EmptyState, LoadingState } from "@/components/ui/States";
import { PageFrame } from "../dashboard/page";

const groups: Array<{ key: ActionItem["status"]; label: string }> = [{ key: "open", label: "Open" }, { key: "in_progress", label: "In progress" }, { key: "done", label: "Done" }];

export default function ActionsPage() { const client = useQueryClient(); const query = useQuery({ queryKey: ["actions"], queryFn: api.actions }); const mutation = useMutation({ mutationFn: ({ id, status }: { id: string; status: ActionItem["status"] }) => api.updateAction(id, status), onSuccess: () => client.invalidateQueries({ queryKey: ["actions"] }) }); return <PageFrame eyebrow="Coordination queue" title="The work that needs an owner" detail="Assignment and status changes are operational records. They do not execute funds movement or provider commands.">{query.isLoading ? <LoadingState label="Loading action queue"/> : query.isError ? <ApiUnavailable onRetry={() => query.refetch()} /> : <ActionBoard items={query.data ?? []} updating={mutation.isPending} onAdvance={(item, next) => mutation.mutate({ id: item.id, status: next })}/>}</PageFrame>; }

function ActionBoard({ items, onAdvance, updating }: { items: ActionItem[]; updating: boolean; onAdvance: (item: ActionItem, next: ActionItem["status"]) => void }) { return <section className="action-board">{groups.map((group) => { const cards = items.filter((item) => item.status === group.key); return <div className="action-column" key={group.key}><header><span>{group.label}</span><b>{cards.length}</b></header>{cards.length ? cards.map((item) => <article className="action-card" key={item.id}><div className="card-top"><span className="action-id">{item.id}</span><span className="due"><Clock3 size={13}/>{new Date(item.dueAt).toUTCString()}</span></div><h2>{item.title}</h2><p>{item.rationale}</p><footer><span><CircleUserRound size={15}/>{item.assignee ?? "Unassigned"}</span>{group.key !== "done" && <button disabled={updating} onClick={() => onAdvance(item, group.key === "open" ? "in_progress" : "done")}>{group.key === "open" ? "Start" : "Complete"}<ArrowRight size={14}/></button>}</footer></article>) : <div className="empty-column"><ListTodo size={19}/><span>No {group.label.toLowerCase()} actions</span></div>}</div>; })}</section>; }

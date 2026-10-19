import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Tabs,
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  Checkbox,
  Popconfirm,
  Badge,
  Tooltip,
  Typography,
  Row,
  Col,
  message,
  Empty,
  Divider,
  Dropdown,
} from 'antd';
import {
  TeamOutlined,
  UserAddOutlined,
  SafetyCertificateOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  MailOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  StopOutlined,
  SearchOutlined,
  KeyOutlined,
  MoreOutlined,
  CrownOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { usePermissions } from '../../hooks/usePermissions.js';
import { teamsApi } from '../../services/teamsApi.js';
import { companiesApi } from '../../services/companiesApi.js';
import { brandTokens, lightSemanticTokens, darkSemanticTokens } from '../../theme/tokens.js';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

export function TeamsPage() {
  const { t } = useTranslation();
  const { user } = useSelector((state) => state.auth);
  const isDarkMode = useSelector((state) => state.theme?.isDarkMode);
  const semantic = isDarkMode ? darkSemanticTokens : lightSemanticTokens;
  const { can, isSuperAdmin, refreshPermissions } = usePermissions();

  const [activeTab, setActiveTab] = useState('teams');

  // Teams state
  const [teams, setTeams] = useState([]);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [teamsSearch, setTeamsSearch] = useState('');
  const [selectedTeam, setSelectedTeam] = useState(null);

  // Members state
  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersSearch, setMembersSearch] = useState('');
  const [memberRoleFilter, setMemberRoleFilter] = useState('');
  const [memberStatusFilter, setMemberStatusFilter] = useState('');

  // Roles state
  const [roles, setRoles] = useState([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [permissionSchema, setPermissionSchema] = useState({ modules: [], actions: [] });

  // Companies state (for super admin assignment)
  const [companies, setCompanies] = useState([]);

  // Modals state
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  const [teamForm] = Form.useForm();

  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteForm] = Form.useForm();
  const [inviting, setInviting] = useState(false);

  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [roleForm] = Form.useForm();
  const [rolePermissions, setRolePermissions] = useState({});
  const [savingRole, setSavingRole] = useState(false);

  const [isMemberRoleModalOpen, setIsMemberRoleModalOpen] = useState(false);
  const [targetMember, setTargetMember] = useState(null);
  const [memberRoleForm] = Form.useForm();

  // ----------------------------------------------------
  // Data Fetching
  // ----------------------------------------------------

  const fetchTeams = useCallback(async () => {
    setTeamsLoading(true);
    try {
      const res = await teamsApi.getTeams({ search: teamsSearch });
      if (res.success) {
        setTeams(res.teams || []);
      }
    } catch (err) {
      message.error(err.response?.data?.error || t('teams.fetchFailed', 'Failed to load teams'));
    } finally {
      setTeamsLoading(false);
    }
  }, [teamsSearch, t]);

  const fetchMembers = useCallback(async () => {
    setMembersLoading(true);
    try {
      const res = await teamsApi.getMembers({
        search: membersSearch,
        role: memberRoleFilter || undefined,
        status: memberStatusFilter || undefined,
      });
      if (res.success) {
        setMembers(res.members || []);
      }
    } catch (err) {
      message.error(err.response?.data?.error || t('teams.fetchMembersFailed', 'Failed to load team members'));
    } finally {
      setMembersLoading(false);
    }
  }, [membersSearch, memberRoleFilter, memberStatusFilter, t]);

  const fetchRoles = useCallback(async () => {
    setRolesLoading(true);
    try {
      const [rolesRes, schemaRes] = await Promise.all([
        teamsApi.getRoles(),
        teamsApi.getPermissionSchema(),
      ]);
      if (rolesRes.success) {
        setRoles(rolesRes.data || []);
      }
      if (schemaRes.success) {
        setPermissionSchema(schemaRes.data || { modules: [], actions: [] });
      }
    } catch (err) {
      message.error(err.response?.data?.error || t('roles.fetchFailed', 'Failed to load roles'));
    } finally {
      setRolesLoading(false);
    }
  }, [t]);

  const fetchCompanies = useCallback(async () => {
    if (!isSuperAdmin) return;
    try {
      const res = await companiesApi.getCompanies({ limit: 100 });
      if (res.success) {
        setCompanies(res.data?.companies || res.data || []);
      }
    } catch (err) {
      console.warn('Companies list lookup failed', err);
    }
  }, [isSuperAdmin]);

  useEffect(() => {
    fetchTeams();
    fetchMembers();
    fetchRoles();
    fetchCompanies();
  }, [fetchTeams, fetchMembers, fetchRoles, fetchCompanies]);

  // ----------------------------------------------------
  // Team Actions
  // ----------------------------------------------------

  const handleOpenCreateTeam = () => {
    setEditingTeam(null);
    teamForm.resetFields();
    setIsTeamModalOpen(true);
  };

  const handleOpenEditTeam = (team) => {
    setEditingTeam(team);
    teamForm.setFieldsValue({
      name: team.name,
      description: team.description,
      companyId: team.companyId,
    });
    setIsTeamModalOpen(true);
  };

  const handleSaveTeam = async () => {
    try {
      const values = await teamForm.validateFields();
      if (editingTeam) {
        const res = await teamsApi.updateTeam(editingTeam.id, values);
        if (res.success) {
          message.success(t('teams.teamUpdated', 'Team updated successfully'));
        }
      } else {
        const res = await teamsApi.createTeam(values);
        if (res.success) {
          message.success(t('teams.teamCreated', 'Team created successfully'));
        }
      }
      setIsTeamModalOpen(false);
      fetchTeams();
    } catch (err) {
      if (err.errorFields) return;
      message.error(err.response?.data?.error || t('teams.saveFailed', 'Failed to save team'));
    }
  };

  const handleDeleteTeam = async (teamId) => {
    try {
      const res = await teamsApi.deleteTeam(teamId);
      if (res.success) {
        message.success(t('teams.teamDeleted', 'Team deleted successfully'));
        fetchTeams();
        if (selectedTeam?.id === teamId) setSelectedTeam(null);
      }
    } catch (err) {
      message.error(err.response?.data?.error || t('teams.deleteFailed', 'Failed to delete team'));
    }
  };

  // ----------------------------------------------------
  // Member & Invitation Actions
  // ----------------------------------------------------

  const handleOpenInviteModal = () => {
    inviteForm.resetFields();
    if (selectedTeam) {
      inviteForm.setFieldsValue({ teamId: selectedTeam.id });
    }
    setIsInviteModalOpen(true);
  };

  const handleSendInvite = async () => {
    try {
      const values = await inviteForm.validateFields();
      setInviting(true);
      const res = await teamsApi.inviteMember(values);
      if (res.success) {
        message.success(res.message || t('teams.inviteSent', 'Invitation sent successfully'));
        setIsInviteModalOpen(false);
        fetchMembers();
        fetchTeams();
      }
    } catch (err) {
      if (err.errorFields) return;
      message.error(err.response?.data?.error || t('teams.inviteFailed', 'Failed to send invitation'));
    } finally {
      setInviting(false);
    }
  };

  const handleResendInvitation = async (invitationId) => {
    try {
      const res = await teamsApi.resendInvitation(invitationId);
      if (res.success) {
        message.success(res.message || t('teams.inviteResent', 'Invitation resent successfully'));
        fetchMembers();
      }
    } catch (err) {
      message.error(err.response?.data?.error || t('teams.resendFailed', 'Failed to resend invitation'));
    }
  };

  const handleStatusChange = async (userId, newStatus) => {
    try {
      const res = await teamsApi.updateMemberStatus(userId, { status: newStatus });
      if (res.success) {
        message.success(t('teams.statusUpdated', `Member status changed to ${newStatus}`));
        fetchMembers();
      }
    } catch (err) {
      message.error(err.response?.data?.error || t('teams.statusFailed', 'Failed to update member status'));
    }
  };

  const handleOpenChangeRole = (member) => {
    setTargetMember(member);
    memberRoleForm.setFieldsValue({
      roleId: member.customRole?.id || member.role,
    });
    setIsMemberRoleModalOpen(true);
  };

  const handleSaveMemberRole = async () => {
    try {
      const values = await memberRoleForm.validateFields();
      const roleIdOrCode = values.roleId;

      const selectedRoleObj = roles.find((r) => r.id === roleIdOrCode || r.code === roleIdOrCode);

      if (targetMember?.teams?.[0]?.teamId) {
        const teamId = targetMember.teams[0].teamId;
        const teamObj = teams.find((t) => t.id === teamId);
        const tm = teamObj?.members?.find((m) => m.companyUser?.id === targetMember.id || m.admin?.id === targetMember.id);
        if (tm) {
          await teamsApi.updateMemberRole(teamId, tm.id, {
            roleId: selectedRoleObj?.id || null,
            role: selectedRoleObj?.code || roleIdOrCode,
          });
        }
      }

      message.success(t('teams.roleAssigned', 'Role updated successfully'));
      setIsMemberRoleModalOpen(false);
      fetchMembers();
      fetchTeams();
      refreshPermissions();
    } catch (err) {
      if (err.errorFields) return;
      message.error(err.response?.data?.error || t('teams.roleUpdateFailed', 'Failed to update member role'));
    }
  };

  // ----------------------------------------------------
  // Role & Permission Matrix Actions
  // ----------------------------------------------------

  const handleOpenCreateRole = () => {
    setEditingRole(null);
    roleForm.resetFields();
    const initialMatrix = {};
    (permissionSchema.modules || []).forEach((m) => {
      initialMatrix[m.key] = {};
      (permissionSchema.actions || []).forEach((a) => {
        initialMatrix[m.key][a.key] = false;
      });
    });
    setRolePermissions(initialMatrix);
    setIsRoleModalOpen(true);
  };

  const handleOpenEditRole = (role) => {
    setEditingRole(role);
    roleForm.setFieldsValue({
      name: role.name,
      description: role.description,
    });
    setRolePermissions(role.permissions || {});
    setIsRoleModalOpen(true);
  };

  const handlePermissionToggle = (moduleKey, actionKey, checked) => {
    if (editingRole?.code === 'SUPER_ADMIN') return;
    if (editingRole?.isSystem && !isSuperAdmin) return;
    setRolePermissions((prev) => ({
      ...prev,
      [moduleKey]: {
        ...(prev[moduleKey] || {}),
        [actionKey]: checked,
      },
    }));
  };

  const handleToggleAllForModule = (moduleKey, checkAll) => {
    if (editingRole?.code === 'SUPER_ADMIN') return;
    if (editingRole?.isSystem && !isSuperAdmin) return;
    setRolePermissions((prev) => {
      const updatedModule = {};
      (permissionSchema.actions || []).forEach((a) => {
        updatedModule[a.key] = checkAll;
      });
      return {
        ...prev,
        [moduleKey]: updatedModule,
      };
    });
  };

  const handleToggleAllAction = (actionKey, checkAll) => {
    if (editingRole?.code === 'SUPER_ADMIN') return;
    if (editingRole?.isSystem && !isSuperAdmin) return;
    setRolePermissions((prev) => {
      const updated = { ...prev };
      (permissionSchema.modules || []).forEach((m) => {
        updated[m.key] = {
          ...(updated[m.key] || {}),
          [actionKey]: checkAll,
        };
      });
      return updated;
    });
  };

  const handleSaveRole = async () => {
    try {
      const values = await roleForm.validateFields();
      setSavingRole(true);

      const permArray = [];
      Object.entries(rolePermissions).forEach(([mod, actions]) => {
        Object.entries(actions).forEach(([act, allowed]) => {
          permArray.push({
            module: mod,
            action: act,
            allowed: Boolean(allowed),
          });
        });
      });

      if (editingRole) {
        const res = await teamsApi.updateRole(editingRole.id, {
          name: values.name,
          description: values.description,
          permissions: permArray,
        });
        if (res.success) {
          message.success(t('roles.roleUpdated', 'Role and permissions updated successfully'));
        }
      } else {
        const res = await teamsApi.createRole({
          name: values.name,
          description: values.description,
          companyId: values.companyId || null,
          permissions: permArray,
        });
        if (res.success) {
          message.success(t('roles.roleCreated', 'Custom role created successfully'));
        }
      }

      setIsRoleModalOpen(false);
      fetchRoles();
      refreshPermissions();
    } catch (err) {
      if (err.errorFields) return;
      message.error(err.response?.data?.error || t('roles.saveFailed', 'Failed to save role'));
    } finally {
      setSavingRole(false);
    }
  };

  const handleDeleteRole = async (roleId) => {
    try {
      const res = await teamsApi.deleteRole(roleId);
      if (res.success) {
        message.success(t('roles.roleDeleted', 'Role deleted successfully'));
        fetchRoles();
      }
    } catch (err) {
      message.error(err.response?.data?.error || t('roles.deleteFailed', 'Failed to delete role'));
    }
  };

  // ----------------------------------------------------
  // Columns Definitions
  // ----------------------------------------------------

  const teamColumns = [
    {
      title: t('teams.name', 'Team Name'),
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Space direction="vertical" size={2}>
          <Text strong style={{ fontSize: 13.5, color: semantic.textPrimary }}>{text}</Text>
          {record.description && (
            <Text style={{ fontSize: 12, color: semantic.textSecondary }}>{record.description}</Text>
          )}
        </Space>
      ),
    },
    {
      title: t('teams.company', 'Company'),
      dataIndex: ['company', 'name'],
      key: 'company',
      render: (companyName) => (
        companyName ? (
          <Tag
            style={{
              fontSize: 11.5,
              fontWeight: 500,
              borderRadius: 4,
              background: isDarkMode ? 'rgba(79, 168, 192, 0.15)' : '#e0f2fe',
              color: isDarkMode ? '#7dd3fc' : '#0369a1',
              border: 'none',
              padding: '2px 8px',
            }}
          >
            {companyName}
          </Tag>
        ) : (
          <Tag style={{ fontSize: 11.5, borderRadius: 4, border: 'none' }}>Platform</Tag>
        )
      ),
    },
    {
      title: t('teams.membersCount', 'Members'),
      dataIndex: '_count',
      key: 'membersCount',
      render: (count) => (
        <Badge
          count={count?.members || 0}
          overflowCount={999}
          style={{
            backgroundColor: isDarkMode ? brandTokens.teal : brandTokens.navy,
            fontWeight: 600,
            borderRadius: 6,
          }}
        />
      ),
    },
    {
      title: t('teams.created', 'Created'),
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (d) => (
        <Text style={{ fontSize: 12.5, color: semantic.textSecondary }}>
          {new Date(d).toLocaleDateString()}
        </Text>
      ),
    },
    {
      title: t('common.actions', 'Actions'),
      key: 'actions',
      render: (_, record) => (
        <Space size={8}>
          {can('TEAMS', 'EDIT') && (
            <Button
              size="small"
              icon={<EditOutlined style={{ color: isDarkMode ? brandTokens.teal : brandTokens.navySoft }} />}
              onClick={() => handleOpenEditTeam(record)}
              style={{ borderRadius: 6, fontSize: 12 }}
            >
              {t('common.edit', 'Edit')}
            </Button>
          )}
          {can('TEAMS', 'DELETE') && (
            <Popconfirm
              title={t('teams.deleteConfirm', 'Are you sure you want to delete this team?')}
              description={t('teams.deleteWarning', 'Members will remain in the company directory.')}
              onConfirm={() => handleDeleteTeam(record.id)}
              okText={t('common.yes', 'Yes')}
              cancelText={t('common.no', 'No')}
            >
              <Button size="small" danger icon={<DeleteOutlined />} style={{ borderRadius: 6, fontSize: 12 }}>
                {t('common.delete', 'Delete')}
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  const memberColumns = [
    {
      title: t('teams.member', 'Member'),
      key: 'member',
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <Text strong style={{ fontSize: 13.5, color: semantic.textPrimary }}>{record.name}</Text>
          <Text style={{ fontSize: 12, color: semantic.textSecondary }}>{record.email}</Text>
        </Space>
      ),
    },
    {
      title: t('teams.assignedRole', 'Role'),
      key: 'role',
      render: (_, record) => {
        const roleName = record.effectiveRoleName || record.role;
        const isSys = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'RECRUITER', 'HIRING_MANAGER'].includes(roleName);
        return (
          <Space size={8}>
            <Tag
              color={isSys ? 'geekblue' : 'purple'}
              style={{
                borderRadius: 4,
                fontWeight: 500,
                fontSize: 11.5,
                padding: '2px 8px',
              }}
            >
              {isSys ? <CrownOutlined style={{ marginRight: 4 }} /> : null}
              {roleName}
            </Tag>
            <Button
              type="link"
              size="small"
              onClick={() => handleOpenChangeRole(record)}
              style={{ padding: 0, fontSize: 12 }}
            >
              {t('teams.change', 'Change')}
            </Button>
          </Space>
        );
      },
    },
    {
      title: t('teams.teamsJoined', 'Teams'),
      dataIndex: 'teams',
      key: 'teams',
      render: (memberTeams) =>
        memberTeams && memberTeams.length > 0 ? (
          <Space wrap size={[0, 4]}>
            {memberTeams.map((t) => (
              <Tag
                key={t.teamId}
                style={{
                  borderRadius: 4,
                  fontSize: 11,
                  background: isDarkMode ? 'rgba(255,255,255,0.06)' : '#f1f5f9',
                  border: `1px solid ${semantic.borderSubtle}`,
                  color: semantic.textPrimary,
                }}
              >
                {t.teamName}
              </Tag>
            ))}
          </Space>
        ) : (
          <Text italic style={{ fontSize: 12, color: semantic.textSecondary }}>
            {t('teams.noTeam', 'No team')}
          </Text>
        ),
    },
    {
      title: t('teams.status', 'Status'),
      key: 'status',
      render: (_, record) => {
        const s = record.status;
        const colorMap = {
          ACTIVE: 'success',
          INVITED: 'warning',
          SUSPENDED: 'error',
          DEACTIVATED: 'default',
        };
        return (
          <Space direction="vertical" size={2}>
            <Tag color={colorMap[s] || 'default'} style={{ borderRadius: 4, fontWeight: 500, fontSize: 11.5 }}>
              {s}
            </Tag>
            {s === 'INVITED' && record.pendingInvitation && can('TEAMS', 'CREATE') && (
              <Button
                type="link"
                size="small"
                icon={<MailOutlined />}
                onClick={() => handleResendInvitation(record.pendingInvitation.id)}
                style={{ padding: 0, fontSize: 11 }}
              >
                {t('teams.resendInvite', 'Resend Invite')}
              </Button>
            )}
          </Space>
        );
      },
    },
    {
      title: t('common.actions', 'Actions'),
      key: 'actions',
      render: (_, record) => {
        const canEditMember = can('TEAMS', 'EDIT');
        const items = [
          canEditMember && {
            key: 'role',
            label: t('teams.changeRole', 'Change Role'),
            icon: <KeyOutlined />,
            onClick: () => handleOpenChangeRole(record),
          },
          canEditMember && record.status !== 'ACTIVE' && {
            key: 'activate',
            label: t('teams.activate', 'Activate Member'),
            icon: <CheckCircleOutlined />,
            onClick: () => handleStatusChange(record.id, 'ACTIVE'),
          },
          canEditMember && record.status !== 'SUSPENDED' && {
            key: 'suspend',
            label: t('teams.suspend', 'Suspend Access'),
            icon: <StopOutlined />,
            danger: true,
            onClick: () => handleStatusChange(record.id, 'SUSPENDED'),
          },
          canEditMember && record.status !== 'DEACTIVATED' && {
            key: 'deactivate',
            label: t('teams.deactivate', 'Deactivate'),
            icon: <CloseCircleOutlined />,
            danger: true,
            onClick: () => handleStatusChange(record.id, 'DEACTIVATED'),
          },
        ].filter(Boolean);

        if (items.length === 0) return null;

        return (
          <Dropdown menu={{ items }} trigger={['click']}>
            <Button size="small" icon={<MoreOutlined />} style={{ borderRadius: 6, fontSize: 12 }}>
              {t('common.manage', 'Manage')}
            </Button>
          </Dropdown>
        );
      },
    },
  ];

  // Modern Minimalist KPI Card Renderer
  const renderKpiCard = ({ title, value, icon, color }) => (
    <Card
      className="rt-card-hover"
      variant="outlined"
      style={{
        borderRadius: 12,
        border: `1px solid ${semantic.borderDefault}`,
        background: semantic.bgCard,
        boxShadow: isDarkMode ? 'none' : '0 1px 3px rgba(0,0,0,0.02)',
        height: '100%',
      }}
      styles={{
        body: {
          padding: '16px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
        },
      }}
    >
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: 8,
          background: isDarkMode ? 'rgba(79, 168, 192, 0.12)' : 'rgba(22, 49, 63, 0.05)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 18,
          color: color || (isDarkMode ? brandTokens.teal : brandTokens.navy),
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 12.5, fontWeight: 500, color: semantic.textSecondary, lineHeight: 1.3 }}>
          {title}
        </div>
        <div style={{ fontSize: 22, fontWeight: 700, color: semantic.textPrimary, lineHeight: 1.2, marginTop: 2 }}>
          {value}
        </div>
      </div>
    </Card>
  );

  return (
    <div className="rt-page-container" style={{ maxWidth: 1400, margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <Title level={2} style={{ margin: 0, fontSize: 22, fontWeight: 700, color: semantic.textPrimary }}>
            <TeamOutlined style={{ marginRight: 8, color: isDarkMode ? brandTokens.teal : brandTokens.navy }} />
            {t('teams.pageTitle', 'Teams & Permission Management (RBAC)')}
          </Title>
          <Paragraph style={{ marginTop: 4, marginBottom: 0, fontSize: 13, color: semantic.textSecondary }}>
            {t(
              'teams.pageSubtitle',
              'Organize recruitment teams, invite members with secure token-based activation, and configure granular role-based permissions.'
            )}
          </Paragraph>
        </div>

        <Space size={10}>
          {can('TEAMS', 'CREATE') && (
            <Button
              type="primary"
              icon={<UserAddOutlined />}
              onClick={handleOpenInviteModal}
              style={{
                backgroundColor: isDarkMode ? brandTokens.teal : brandTokens.navy,
                borderColor: isDarkMode ? brandTokens.teal : brandTokens.navy,
                fontWeight: 600,
                borderRadius: 8,
              }}
            >
              {t('teams.inviteMember', 'Invite Member')}
            </Button>
          )}
          {can('TEAMS', 'CREATE') && (
            <Button
              icon={<PlusOutlined />}
              onClick={handleOpenCreateTeam}
              style={{ borderRadius: 8, fontWeight: 500 }}
            >
              {t('teams.createTeam', 'Create Team')}
            </Button>
          )}
        </Space>
      </div>

      {/* Top Quick Stats */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={8}>
          {renderKpiCard({
            title: t('teams.totalTeams', 'Active Teams'),
            value: teams.length,
            icon: <TeamOutlined />,
            color: isDarkMode ? brandTokens.teal : brandTokens.navy,
          })}
        </Col>
        <Col xs={24} sm={8}>
          {renderKpiCard({
            title: t('teams.totalMembers', 'Team Members'),
            value: members.length,
            icon: <UserAddOutlined />,
            color: brandTokens.success,
          })}
        </Col>
        <Col xs={24} sm={8}>
          {renderKpiCard({
            title: t('roles.totalRoles', 'Defined Roles'),
            value: roles.length,
            icon: <SafetyCertificateOutlined />,
            color: '#8b5cf6',
          })}
        </Col>
      </Row>

      {/* Main Tabs Container */}
      <Card
        variant="outlined"
        style={{
          borderRadius: 12,
          border: `1px solid ${semantic.borderDefault}`,
          background: semantic.bgCard,
        }}
        styles={{ body: { padding: '16px 20px 20px 20px' } }}
      >
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'teams',
              label: (
                <span>
                  <TeamOutlined style={{ marginRight: 6 }} />
                  {t('teams.tabTeams', 'Teams & Members')}
                </span>
              ),
              children: (
                <div>
                  {/* Teams Directory Section */}
                  <div style={{ marginBottom: 24 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                      <Title level={4} style={{ margin: 0, fontSize: 16, color: semantic.textPrimary }}>
                        {t('teams.teamsList', 'Teams Directory')}
                      </Title>
                      <Space size={8}>
                        <Input
                          placeholder={t('teams.searchTeams', 'Search teams...')}
                          prefix={<SearchOutlined style={{ color: semantic.textDisabled }} />}
                          value={teamsSearch}
                          onChange={(e) => setTeamsSearch(e.target.value)}
                          onPressEnter={fetchTeams}
                          allowClear
                          style={{ width: 220, borderRadius: 6 }}
                        />
                        <Button icon={<ReloadOutlined />} onClick={fetchTeams} style={{ borderRadius: 6 }} />
                      </Space>
                    </div>

                    <div className="rt-table-wrapper">
                      <Table
                        dataSource={teams}
                        columns={teamColumns}
                        rowKey="id"
                        loading={teamsLoading}
                        pagination={{ pageSize: 5 }}
                        locale={{ emptyText: <Empty description={t('teams.noTeamsFound', 'No teams created yet')} /> }}
                      />
                    </div>
                  </div>

                  <Divider style={{ borderColor: semantic.borderSubtle, margin: '20px 0' }} />

                  {/* Members Directory Section */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 12 }}>
                      <Title level={4} style={{ margin: 0, fontSize: 16, color: semantic.textPrimary }}>
                        {t('teams.membersDirectory', 'Members Directory')}
                      </Title>
                      <Space wrap size={8}>
                        <Input
                          placeholder={t('teams.searchMembers', 'Search by name or email...')}
                          prefix={<SearchOutlined style={{ color: semantic.textDisabled }} />}
                          value={membersSearch}
                          onChange={(e) => setMembersSearch(e.target.value)}
                          onPressEnter={fetchMembers}
                          allowClear
                          style={{ width: 220, borderRadius: 6 }}
                        />
                        <Select
                          placeholder={t('teams.filterRole', 'Filter by Role')}
                          value={memberRoleFilter || undefined}
                          onChange={(val) => setMemberRoleFilter(val || '')}
                          allowClear
                          style={{ width: 160 }}
                        >
                          {roles.map((r) => (
                            <Option key={r.code || r.id} value={r.code || r.name}>
                              {r.name}
                            </Option>
                          ))}
                        </Select>
                        <Select
                          placeholder={t('teams.filterStatus', 'Filter by Status')}
                          value={memberStatusFilter || undefined}
                          onChange={(val) => setMemberStatusFilter(val || '')}
                          allowClear
                          style={{ width: 140 }}
                        >
                          <Option value="ACTIVE">ACTIVE</Option>
                          <Option value="INVITED">INVITED</Option>
                          <Option value="SUSPENDED">SUSPENDED</Option>
                          <Option value="DEACTIVATED">DEACTIVATED</Option>
                        </Select>
                        <Button icon={<ReloadOutlined />} onClick={fetchMembers} style={{ borderRadius: 6 }} />
                      </Space>
                    </div>

                    <div className="rt-table-wrapper">
                      <Table
                        dataSource={members}
                        columns={memberColumns}
                        rowKey="id"
                        loading={membersLoading}
                        pagination={{ pageSize: 10 }}
                        locale={{ emptyText: <Empty description={t('teams.noMembersFound', 'No members found')} /> }}
                      />
                    </div>
                  </div>
                </div>
              ),
            },
            {
              key: 'roles',
              label: (
                <span>
                  <SafetyCertificateOutlined style={{ marginRight: 6 }} />
                  {t('roles.tabRoles', 'Roles & Granular Permissions')}
                </span>
              ),
              children: (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
                    <div>
                      <Title level={4} style={{ margin: 0, fontSize: 16, color: semantic.textPrimary }}>
                        {t('roles.rolesDirectory', 'Role-Based Access Control (RBAC)')}
                      </Title>
                      <Text style={{ fontSize: 13, color: semantic.textSecondary }}>
                        {t('roles.rolesDescription', 'Configure reusable roles and matrix permissions across modules and actions.')}
                      </Text>
                    </div>
                    <Space size={8}>
                      {can('TEAMS', 'CREATE') && (
                        <Button
                          type="primary"
                          icon={<PlusOutlined />}
                          onClick={handleOpenCreateRole}
                          style={{
                            backgroundColor: isDarkMode ? brandTokens.teal : brandTokens.navy,
                            borderColor: isDarkMode ? brandTokens.teal : brandTokens.navy,
                            fontWeight: 600,
                            borderRadius: 8,
                          }}
                        >
                          {t('roles.createCustomRole', 'Create Custom Role')}
                        </Button>
                      )}
                      <Button icon={<ReloadOutlined />} onClick={fetchRoles} style={{ borderRadius: 6 }} />
                    </Space>
                  </div>

                  {/* Roles Cards Grid */}
                  <Row gutter={[16, 16]}>
                    {roles.map((role) => (
                      <Col xs={24} md={12} lg={8} key={role.id}>
                        <Card
                          className="rt-card-hover"
                          variant="outlined"
                          style={{
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            borderRadius: 12,
                            borderColor: role.isSystem
                              ? (isDarkMode ? 'rgba(79, 168, 192, 0.3)' : '#bae6fd')
                              : semantic.borderDefault,
                            backgroundColor: role.isSystem
                              ? (isDarkMode ? 'rgba(79, 168, 192, 0.05)' : '#f8fafc')
                              : semantic.bgCard,
                          }}
                          styles={{ body: { padding: '16px 18px', display: 'flex', flexDirection: 'column', height: '100%' } }}
                        >
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                              <Text strong style={{ fontSize: 15, color: semantic.textPrimary }}>
                                {role.name}
                              </Text>
                              {role.isSystem ? (
                                <Tag color="blue" style={{ borderRadius: 4, fontWeight: 500, fontSize: 11 }}>
                                  {t('roles.systemRole', 'System')}
                                </Tag>
                              ) : (
                                <Tag color="purple" style={{ borderRadius: 4, fontWeight: 500, fontSize: 11 }}>
                                  {t('roles.customRole', 'Custom')}
                                </Tag>
                              )}
                            </div>

                            <Text style={{ fontSize: 12.5, color: semantic.textSecondary, display: 'block', minHeight: 38, marginBottom: 12, lineHeight: 1.4 }}>
                              {role.description || t('roles.noDescription', 'No description provided')}
                            </Text>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, marginBottom: 14 }}>
                              <Text style={{ color: semantic.textSecondary }}>{t('roles.assignedMembers', 'Assigned Members')}:</Text>
                              <Badge
                                count={role.assignedCount || 0}
                                overflowCount={999}
                                style={{ backgroundColor: '#64748b', fontWeight: 600, borderRadius: 6 }}
                              />
                            </div>
                          </div>

                          <div style={{ borderTop: `1px solid ${semantic.borderSubtle}`, paddingTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Button
                              size="small"
                              icon={<KeyOutlined style={{ color: isDarkMode ? brandTokens.teal : brandTokens.navySoft }} />}
                              onClick={() => handleOpenEditRole(role)}
                              style={{ borderRadius: 6, fontSize: 12 }}
                            >
                              {role.isSystem ? t('roles.viewPermissions', 'View Permissions') : t('roles.editPermissions', 'Configure Matrix')}
                            </Button>

                            {!role.isSystem && can('TEAMS', 'DELETE') && (
                              <Popconfirm
                                title={t('roles.deleteConfirm', 'Delete this custom role?')}
                                description={t('roles.deleteWarning', 'Role must have 0 assigned members.')}
                                onConfirm={() => handleDeleteRole(role.id)}
                                disabled={role.assignedCount > 0}
                                okText={t('common.yes', 'Yes')}
                                cancelText={t('common.no', 'No')}
                              >
                                <Button
                                  size="small"
                                  danger
                                  icon={<DeleteOutlined />}
                                  disabled={role.assignedCount > 0}
                                  style={{ borderRadius: 6 }}
                                />
                              </Popconfirm>
                            )}
                          </div>
                        </Card>
                      </Col>
                    ))}
                  </Row>
                </div>
              ),
            },
          ]}
        />
      </Card>

      {/* ---------------------------------------------------- */}
      {/* Create / Edit Team Modal */}
      {/* ---------------------------------------------------- */}
      <Modal
        title={editingTeam ? t('teams.editTeam', 'Edit Team') : t('teams.createTeam', 'Create New Team')}
        open={isTeamModalOpen}
        onOk={handleSaveTeam}
        onCancel={() => setIsTeamModalOpen(false)}
        okText={t('common.save', 'Save')}
        cancelText={t('common.cancel', 'Cancel')}
        centered
        destroyOnHidden
      >
        <Form form={teamForm} layout="vertical" style={{ marginTop: 12 }}>
          <Form.Item
            name="name"
            label={t('teams.teamName', 'Team Name')}
            rules={[{ required: true, message: t('teams.nameRequired', 'Team name is required') }]}
          >
            <Input placeholder={t('teams.teamNamePlaceholder', 'e.g. Engineering Recruitment Team')} maxLength={100} />
          </Form.Item>

          <Form.Item
            name="description"
            label={t('teams.description', 'Description')}
          >
            <Input.TextArea rows={3} placeholder={t('teams.descPlaceholder', 'Purpose and scope of this team...')} maxLength={500} />
          </Form.Item>

          {isSuperAdmin && !editingTeam && (
            <Form.Item
              name="companyId"
              label={t('teams.associateCompany', 'Associate Company')}
              help={t('teams.companyHelp', 'Leave empty to create a platform-wide administrative team')}
            >
              <Select placeholder={t('teams.selectCompany', 'Select Company (Optional)')} allowClear>
                {companies.map((c) => (
                  <Option key={c.id} value={c.id}>
                    {c.name} ({c.companyCode || c.id.slice(0, 8)})
                  </Option>
                ))}
              </Select>
            </Form.Item>
          )}
        </Form>
      </Modal>

      {/* ---------------------------------------------------- */}
      {/* Invite Member Modal */}
      {/* ---------------------------------------------------- */}
      <Modal
        title={t('teams.inviteTitle', 'Invite Member to Team')}
        open={isInviteModalOpen}
        onOk={handleSendInvite}
        onCancel={() => setIsInviteModalOpen(false)}
        confirmLoading={inviting}
        okText={t('teams.sendInvite', 'Send Invitation')}
        cancelText={t('common.cancel', 'Cancel')}
        centered
        destroyOnHidden
      >
        <Paragraph style={{ fontSize: 13, color: semantic.textSecondary, marginBottom: 16, lineHeight: 1.4 }}>
          {t(
            'teams.inviteInfo',
            'An invitation email with a single-use secure link will be sent to the recipient. They will configure their confidential credentials upon accepting. No permanent or default passwords are used.'
          )}
        </Paragraph>

        <Form form={inviteForm} layout="vertical">
          <Form.Item
            name="email"
            label={t('teams.emailAddress', 'Email Address')}
            rules={[
              { required: true, message: t('teams.emailRequired', 'Email is required') },
              { type: 'email', message: t('teams.emailInvalid', 'Please enter a valid email address') },
            ]}
          >
            <Input placeholder="colleague@organization.com" />
          </Form.Item>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="firstName" label={t('teams.firstName', 'First Name')}>
                <Input placeholder="John" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="lastName" label={t('teams.lastName', 'Last Name')}>
                <Input placeholder="Doe" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="teamId"
            label={t('teams.assignTeam', 'Assign to Team')}
          >
            <Select placeholder={t('teams.selectTeam', 'Select Team (Optional)')} allowClear>
              {teams.map((t) => (
                <Option key={t.id} value={t.id}>
                  {t.name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="roleId"
            label={t('teams.selectRole', 'Assigned Role')}
            rules={[{ required: true, message: t('teams.roleRequired', 'Please assign a role') }]}
            initialValue="RECRUITER"
          >
            <Select placeholder={t('teams.chooseRole', 'Choose Role')}>
              {roles.map((r) => (
                <Option key={r.id || r.code} value={r.id || r.code}>
                  {r.name} {r.isSystem ? `(${t('roles.systemRole', 'System')})` : `(${t('roles.customRole', 'Custom')})`}
                </Option>
              ))}
            </Select>
          </Form.Item>

          {isSuperAdmin && (
            <Form.Item
              name="companyId"
              label={t('teams.company', 'Company')}
              rules={[{ required: true, message: t('teams.companyRequired', 'Company is required') }]}
            >
              <Select placeholder={t('teams.selectCompany', 'Select Company')}>
                {companies.map((c) => (
                  <Option key={c.id} value={c.id}>
                    {c.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          )}
        </Form>
      </Modal>

      {/* ---------------------------------------------------- */}
      {/* Change Member Role Modal */}
      {/* ---------------------------------------------------- */}
      <Modal
        title={t('teams.changeMemberRole', 'Change Member Role')}
        open={isMemberRoleModalOpen}
        onOk={handleSaveMemberRole}
        onCancel={() => setIsMemberRoleModalOpen(false)}
        okText={t('common.save', 'Save')}
        cancelText={t('common.cancel', 'Cancel')}
        centered
        destroyOnHidden
      >
        <Form form={memberRoleForm} layout="vertical" style={{ marginTop: 12 }}>
          <Paragraph style={{ color: semantic.textPrimary, marginBottom: 16 }}>
            <Text strong>{targetMember?.name}</Text> <span style={{ color: semantic.textSecondary }}>({targetMember?.email})</span>
          </Paragraph>

          <Form.Item
            name="roleId"
            label={t('teams.newRole', 'New Role')}
            rules={[{ required: true, message: t('teams.roleRequired', 'Role is required') }]}
          >
            <Select placeholder={t('teams.chooseRole', 'Choose Role')}>
              {roles.map((r) => (
                <Option key={r.id || r.code} value={r.id || r.code}>
                  {r.name} {r.isSystem ? `(${t('roles.systemRole', 'System')})` : `(${t('roles.customRole', 'Custom')})`}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* ---------------------------------------------------- */}
      {/* Granular Permission Matrix Modal */}
      {/* ---------------------------------------------------- */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <KeyOutlined style={{ color: isDarkMode ? brandTokens.teal : brandTokens.navy }} />
            <span>
              {editingRole
                ? `${t('roles.configureMatrix', 'Permission Matrix')}: ${editingRole.name}`
                : t('roles.newRole', 'New Custom Role & Permission Matrix')}
            </span>
          </div>
        }
        open={isRoleModalOpen}
        onOk={handleSaveRole}
        onCancel={() => setIsRoleModalOpen(false)}
        width={920}
        confirmLoading={savingRole}
        okButtonProps={
          (editingRole?.isSystem && !isSuperAdmin) ||
          (editingRole && !can('TEAMS', 'EDIT')) ||
          (!editingRole && !can('TEAMS', 'CREATE'))
            ? { style: { display: 'none' } }
            : undefined
        }
        okText={t('common.save', 'Save Matrix')}
        cancelText={t('common.cancel', 'Cancel')}
        centered
        destroyOnHidden
      >
        <Form form={roleForm} layout="vertical" style={{ marginTop: 12 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label={t('roles.roleName', 'Role Name')}
                rules={[{ required: true, message: t('roles.nameRequired', 'Role name is required') }]}
              >
                <Input
                  disabled={editingRole?.isSystem}
                  placeholder={t('roles.roleNamePlaceholder', 'e.g. Senior Talent Lead')}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="description" label={t('roles.description', 'Role Description')}>
                <Input
                  disabled={editingRole?.isSystem && editingRole?.code === 'SUPER_ADMIN'}
                  placeholder={t('roles.descPlaceholder', 'Scope and responsibility of this role...')}
                />
              </Form.Item>
            </Col>
          </Row>
        </Form>

        {editingRole?.isSystem && (
          <div
            style={{
              backgroundColor: isDarkMode ? 'rgba(79, 168, 192, 0.1)' : '#f0f9ff',
              border: `1px solid ${isDarkMode ? 'rgba(79, 168, 192, 0.25)' : '#bae6fd'}`,
              borderRadius: 6,
              padding: '10px 14px',
              marginBottom: 16,
            }}
          >
            <Text style={{ fontSize: 13, color: semantic.textSecondary }}>
              {t(
                'roles.systemRoleNotice',
                'System roles are defined by platform policy. Super Admin possesses comprehensive unconditional access across all actions.'
              )}
            </Text>
          </div>
        )}

        {/* Matrix Quick Actions */}
        {!editingRole?.isSystem && (
          <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button size="small" onClick={() => handleToggleAllAction('READ', true)} style={{ borderRadius: 6, fontSize: 12 }}>
              {t('roles.grantAllRead', 'Grant All Read')}
            </Button>
            <Button size="small" onClick={() => handleToggleAllAction('READ', false)} style={{ borderRadius: 6, fontSize: 12 }}>
              {t('roles.clearAllRead', 'Clear All Read')}
            </Button>
          </div>
        )}

        {/* The Permission Matrix Table */}
        <div className="rt-permission-matrix-container" style={{ background: semantic.bgCard }}>
          <table className="rt-matrix-table">
            <thead>
              <tr>
                <th className="rt-matrix-th" style={{ textAlign: 'left', minWidth: 200 }}>
                  {t('roles.module', 'Module / Resource')}
                </th>
                {(permissionSchema.actions || []).map((act) => (
                  <th key={act.key} className="rt-matrix-th" style={{ textAlign: 'center', minWidth: 90 }}>
                    <Tooltip title={act.description}>
                      <span>{act.label}</span>
                    </Tooltip>
                  </th>
                ))}
                {!editingRole?.isSystem && (
                  <th className="rt-matrix-th" style={{ textAlign: 'center', minWidth: 100 }}>
                    {t('roles.quickSelect', 'Quick Select')}
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {(permissionSchema.modules || []).map((mod, idx) => {
                const isSuper = editingRole?.code === 'SUPER_ADMIN';
                const rowActions = rolePermissions[mod.key] || {};
                const allChecked = (permissionSchema.actions || []).every((a) => rowActions[a.key]);

                return (
                  <tr
                    key={mod.key}
                    className="rt-matrix-tr"
                    style={{
                      backgroundColor: idx % 2 === 0 ? 'transparent' : (isDarkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)'),
                    }}
                  >
                    <td className="rt-matrix-td">
                      <Text strong style={{ fontSize: 13, color: semantic.textPrimary }}>{mod.label}</Text>
                      {mod.description && (
                        <div style={{ fontSize: 11, color: semantic.textSecondary }}>{mod.description}</div>
                      )}
                    </td>

                    {(permissionSchema.actions || []).map((act) => {
                      const isAllowed = isSuper ? true : Boolean(rowActions[act.key]);
                      return (
                        <td key={act.key} className="rt-matrix-td" style={{ textAlign: 'center' }}>
                          <Checkbox
                            checked={isAllowed}
                            disabled={isSuper || (editingRole?.isSystem && !isSuperAdmin)}
                            onChange={(e) => handlePermissionToggle(mod.key, act.key, e.target.checked)}
                          />
                        </td>
                      );
                    })}

                    {!editingRole?.isSystem && (
                      <td className="rt-matrix-td" style={{ textAlign: 'center' }}>
                        <Button
                          size="small"
                          type="text"
                          onClick={() => handleToggleAllForModule(mod.key, !allChecked)}
                          style={{ fontSize: 11, color: isDarkMode ? brandTokens.teal : brandTokens.navy }}
                        >
                          {allChecked ? t('roles.clear', 'Clear') : t('roles.all', 'All')}
                        </Button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Modal>
    </div>
  );
}

export default TeamsPage;
